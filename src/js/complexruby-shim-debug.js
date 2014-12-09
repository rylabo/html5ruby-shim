/*jslint plusplus: true */

(function () { "use strict";
    var RubyChildAnalyzer = {},
        RubyPreprocessor = {},
        RubyShim = {},
        rubyNode,
        rubyChildren,
        ns,
        i;

    RubyShim.nextNonWhitespaceSibling = function (subNode) {
        if (subNode.nextSibling && RubyChildAnalyzer.isWhitespaceNode(subNode.nextSibling)) {
            return RubyShim.nextNonWhitespaceSibling(subNode.nextSibling);
        }
        // else
        return subNode.nextSibling;
    };

    RubyShim.wrapChildWithNewElement = function (child, newElementTag) {
        var newNode = document.createElement("rb");
        newNode.appendChild(child);
        return newNode;
    };

    RubyShim.wrapChildInNewElementAndPrepend = function (rubyNode, child, newElementTag) {
        var newNode = RubyShim.wrapChildWithNewElement(child, newElementTag);
        rubyNode.insertBefore(newNode, rubyNode.firstChild);
        return rubyNode;
    };

    RubyShim.buildNewTextContainerNode = function (child) {
        var newNode = document.createElement("rtc");
        while (RubyShim.nextNonWhitespaceSibling(child) &&
                RubyShim.nextNonWhitespaceSibling(child).tagName.toLowerCase() === "rt") {
            newNode.appendChild(RubyShim.nextNonWhitespaceSibling(child));
        }
        return newNode;
    };

    RubyShim.appendToContainerNode = function (rubyNode, containerNode, child) {
        var nextChild, newNode;
        if (!child) {
            return containerNode;
        }
        nextChild = RubyShim.nextNonWhitespaceSibling(child);
        if (RubyChildAnalyzer.isNonEmptyBaseNode(child)) {
            containerNode.appendChild(child);
        } else if (RubyChildAnalyzer.isEmptyBaseNodeThenTextNode(child)) {
            // we eventually need to pull the loose empty base nodes from the ruby node
            newNode = RubyShim.wrapChildWithNewElement(RubyShim.nextNonWhitespaceSibling(child), "rb");
            nextChild = RubyShim.nextNonWhitespaceSibling(child);
            rubyNode.removeChild(child);
            containerNode.appendChild(newNode);
        } else if ((child.tagName.toLowerCase() === "rt") ||
                        (child.tagName.toLowerCase() === "rtc") ||
                        (child.tagName.toLowerCase() === "rp")) {
            return containerNode;
        }
        return RubyShim.appendToContainerNode(rubyNode, containerNode, nextChild);
    };

    RubyShim.buildNewBaseContainerNode = function (rubyNode, child) {
        var newNode = document.createElement("rbc"),
            nextChild = RubyShim.nextNonWhitespaceSibling(child);
        if (RubyChildAnalyzer.isTextNode(nextChild)) {
            newNode.appendChild(RubyShim.wrapChildWithNewElement(nextChild, "rb"));
        }
        return RubyShim.appendToContainerNode(rubyNode, newNode, nextChild);
    };

    RubyChildAnalyzer.isTextNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && !(/^[\t\n\r ]+$/.test(DOMelement.nodeValue));
    };
    RubyChildAnalyzer.isWhitespaceNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && (/^[\t\n\r ]+$/.test(DOMelement.nodeValue));
    };
    RubyChildAnalyzer.isEmptyBaseContainerNode = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rbc") &&
            (DOMelement.childNodes.length === 0);
    };
    RubyChildAnalyzer.isNonEmptyBaseNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length !== 0);
    };
    RubyChildAnalyzer.isEmptyBaseNodeThenTextNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length === 0) &&
            (RubyShim.nextNonWhitespaceSibling(DOMelement).nodeType === 3);
    };
    RubyChildAnalyzer.isBadIE8ClosingTagNode = function (DOMelement) {
        // IE8 mishandles rb and rtc tags when reading HTML, creating empty RB nodes and empty nodes tagged "/RB"
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "/rtc") ||
            (DOMelement.tagName.toLowerCase() === "/rb") ||
            (DOMelement.tagName.toLowerCase() === "/rbc"));
    };
    RubyChildAnalyzer.isEmptyTextContainerNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rtc") &&
            (DOMelement.childNodes.length === 0);
    };

    RubyChildAnalyzer.containsNoNodeWithTag = function (tagName) {
        // checks for the lack of a certain type of node.
    };

    RubyPreprocessor.preprocess = function (rubyNode) {
        var children = rubyNode.childNodes,
            newNode,
            i;
        for (i = 0; i < children.length; i++) {
            if (RubyChildAnalyzer.isTextNode(children.item(i)) && (i === 0)) {
                // implicit rb node
                newNode = RubyShim.wrapChildWithNewElement(children.item(i), "rb");
                rubyNode.insertBefore(newNode, rubyNode.firstChild);
            } else if (RubyChildAnalyzer.isEmptyBaseNodeThenTextNode(children.item(i))) {
                newNode = RubyShim.wrapChildWithNewElement(RubyShim.nextNonWhitespaceSibling(children.item(i)), "rb");
                rubyNode.replaceChild(newNode, children.item(i)); //write over current rb node
            } else if (RubyChildAnalyzer.isEmptyTextContainerNode(children.item(i))) {
                // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
                newNode = RubyShim.buildNewTextContainerNode(children.item(i));
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (RubyChildAnalyzer.isEmptyBaseContainerNode(children.item(i))) {
                // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
                newNode = RubyShim.buildNewBaseContainerNode(rubyNode, children.item(i));
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (RubyChildAnalyzer.isBadIE8ClosingTagNode(children.item(i))) {
                rubyNode.removeChild(children.item(i));
                i--;
            }
        }
        return rubyNode;
    };
    rubyChildren = document.getElementsByTagName("ruby");
    for (i = 0; i < rubyChildren.length; i++) {
        rubyNode = document.getElementsByTagName("ruby")[i];
        rubyNode = RubyPreprocessor.preprocess(rubyNode);
    }
    }()
);
