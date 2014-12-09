/*jslint plusplus: true */

(function () { "use strict";
    var RubyChildAnalyzer = {},
        RubyPreprocessor = {},
        RubyShim = {},
        rubyNode,
        rubyChildren,
        ns,
        i;

    RubyShim.reconstructNode = function (DOMelement, tagName) {
    };
    RubyChildAnalyzer.isTextNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && !(/^[\t\n\r ]+$/.test(DOMelement.textContent));
    };
    RubyChildAnalyzer.isWhitespaceNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && (/^[\t\n\r ]+$/.test(DOMelement.textContent));
    };
    RubyChildAnalyzer.isEmptyBaseContainerNode = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rbc") &&
            (DOMelement.childNodes.length === 0);
    };
    RubyChildAnalyzer.isEmptyBaseNodeThenTextNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length === 0) &&
            (DOMelement.nextSibling.nodeType === 3);
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

    RubyPreprocessor.nextNonWhitespaceSibling = function (subNode) {
        if (subNode.nextSibling && RubyChildAnalyzer.isWhitespaceNode(subNode.nextSibling)) {
            return RubyPreprocessor.nextNonWhitespaceSibling(subNode.nextSibling);
        }
        // else
        return subNode.nextSibling;
    };
    RubyPreprocessor.preprocess = function (rubyNode) {
        var children = rubyNode.childNodes,
            child,
            newNode,
            i;
        for (i = 0; i < children.length; i++) {
            child = children.item(i);
            if (RubyChildAnalyzer.isTextNode(child) && (i === 0)) {
                // implicit rb node
                newNode = document.createElement("rb");
                newNode.appendChild(child);
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (RubyChildAnalyzer.isEmptyBaseNodeThenTextNode(child)) {
                // empty rb node followed by a text node.. semantically an rb node
                newNode = document.createElement("rb");
                newNode.appendChild(child.nextSibling);
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (RubyChildAnalyzer.isEmptyTextContainerNode(child)) {
                // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
                newNode = document.createElement("rtc");
                while (RubyPreprocessor.nextNonWhitespaceSibling(child) &&
                        RubyPreprocessor.nextNonWhitespaceSibling(child).tagName.toLowerCase() === "rt") {
                    newNode.appendChild(RubyPreprocessor.nextNonWhitespaceSibling(child));
                }
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (RubyChildAnalyzer.isBadIE8ClosingTagNode(child)) {
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
