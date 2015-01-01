/*jslint plusplus: true */

(function () { "use strict";
    var RubyChildAnalyzer = {},
        RubyPreprocessor = {},
        RubyShim = {},
        rubyNode,
        rubyChildren,
        ns,
        i;

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    RubyShim.nextNonWhitespaceSibling = function (subNode) {
        if (subNode.nextSibling && RubyChildAnalyzer.isWhitespaceNode(subNode.nextSibling)) {
            return RubyShim.nextNonWhitespaceSibling(subNode.nextSibling);
        }
        // else
        return subNode.nextSibling;
    };

    RubyShim.wrapChildWithNewElement = function (child, newElementTag) {
        var newNode = document.createElement(newElementTag);
        newNode.appendChild(child);
        return newNode;
    };

    RubyShim.wrapChildInNewElementAndPrepend = function (rubyNode, child, newElementTag) {
        var newNode = RubyShim.wrapChildWithNewElement(child, newElementTag);
        rubyNode.insertBefore(newNode, rubyNode.firstChild);
        return rubyNode;
    };

    RubyShim.buildNewTextContainerNode = function (child) {
        var newNode = document.createElement("rtc"),
            newRubyTextNode;
        while (child.nextSibling && !(RubyChildAnalyzer.isTextContainerDelimiter(child.nextSibling))) {
            if (RubyChildAnalyzer.isTextNode(child.nextSibling)) {
                newNode.appendChild(RubyShim.wrapChildWithNewElement(child.nextSibling, "rt"));
            } else {
                newNode.appendChild(child.nextSibling);
            }
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

    RubyShim.flatten = function (DOMelement, DOMparent) {
        // rb, rt, rp, rtc
        var i = 0,
            j = 0,
            branches = DOMelement.childNodes;

        for (i = 0; i < branches.length; i++) {
            if (RubyChildAnalyzer.isRubyChildDelimiter(branches.item(i))) {
                // TODO pull out all elements and insert after and including this element within the parent
                for (j = branches.length - 1; j >= i; j--) {
                    DOMparent.insertBefore(branches.item(j), DOMelement.nextSibling);
                }
                return;
            }
        }

    };

    RubyShim.flattenContainer = function (DOMelement, DOMparent) {
        // rb, rt, rp, rtc
        var i = 0,
            j = 0,
            branches = DOMelement.childNodes;

        for (i = 0; i < branches.length; i++) {
            if (RubyChildAnalyzer.isTextContainerDelimiter(branches.item(i))) {
                // TODO pull out all elements and insert after and including this element within the parent
                for (j = branches.length - 1; j >= i; j--) {
                    DOMparent.insertBefore(branches.item(j), DOMelement.nextSibling);
                }
                return;
            }
        }

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
    RubyChildAnalyzer.isRubyChildDelimiter = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rb") ||
             (DOMelement.tagName.toLowerCase() === "rt") ||
             (DOMelement.tagName.toLowerCase() === "rtc") ||
             (DOMelement.tagName.toLowerCase() === "rp"));

    };
    RubyChildAnalyzer.isTextContainerDelimiter = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rb") ||
             (DOMelement.tagName.toLowerCase() === "rtc") ||
             (DOMelement.tagName.toLowerCase() === "rp"));
    };

    RubyChildAnalyzer.isNonEmptyBaseNode = function (DOMelement) {
        // TODO check for telescoping
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

    RubyChildAnalyzer.isTelescopingNode = function (DOMelement) {
        var children,
            i;
        if ((DOMelement.nodeType === 3) ||
                    ((DOMelement.tagName.toLowerCase() !== "rt") &&
                     (DOMelement.tagName.toLowerCase() !== "rb") &&
                     (DOMelement.tagName.toLowerCase() !== "rp"))
                    ) {return false; }
        children = DOMelement.childNodes;
        for (i = 0; i < children.length; i++) {
            if ((children.item(i).nodeType !== 3) && (
                    (children.item(i).tagName.toLowerCase() === "rb") ||
                    (children.item(i).tagName.toLowerCase() === "rt") ||
                    (children.item(i).tagName.toLowerCase() === "rp") ||
                    (children.item(i).tagName.toLowerCase() === "rtc")
                )
                    ) {return true; }
        }
        return false;
    };
    RubyChildAnalyzer.isTelescopingContainerNode = function (DOMelement) {
        var children,
            i;
        if ((DOMelement.nodeType === 3) ||
                    (DOMelement.tagName.toLowerCase() !== "rtc")
                    ) {return false; }
        children = DOMelement.childNodes;
        for (i = 0; i < children.length; i++) {
            if ((children.item(i).nodeType !== 3) && (
                    (children.item(i).tagName.toLowerCase() === "rb") ||
                    (children.item(i).tagName.toLowerCase() === "rp") ||
                    (children.item(i).tagName.toLowerCase() === "rtc")
                )
                    ) {return true; }
        }
        return false;
    };

    RubyChildAnalyzer.isAtomicRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rt") ||
            (DOMelement.tagName.toLowerCase() === "rb") ||
            (DOMelement.tagName.toLowerCase() === "rp"));
    };

    RubyChildAnalyzer.isAtomicRubyTextElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rt");
    };

    RubyChildAnalyzer.isContainerRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rtc");
    };

    RubyChildAnalyzer.isNestedRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "ruby");
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


    RubyPreprocessor.preprocessContainer = function (containerNode, rubyNode) {
        var children = containerNode.childNodes,
            newNode,
            referenceNode,
            i,
            j;

        for (i = 0; i < children.length; i++) {
            if (RubyChildAnalyzer.isTextNode(children.item(i))) {
                referenceNode = children.item(i).nextSibling;
                newNode = RubyShim.wrapChildWithNewElement(children.item(i), "rt");
                containerNode.insertBefore(newNode, referenceNode);
            } else if (RubyChildAnalyzer.isAtomicRubyTextElement(children.item(i))) {
                RubyShim.flatten(children.item(i), containerNode);
            } else if (RubyChildAnalyzer.isTextContainerDelimiter(children.item(i))) {
                for (j = children.length - 1; j >= i; j--) {
                    rubyNode.insertBefore(children.item(j), containerNode.nextSibling);
                }
                return;
            }
        }
    };
    RubyPreprocessor.preprocess = function (rubyNode) {
        var children = rubyNode.childNodes,
            newNode,
            i;
        for (i = 0; i < children.length; i++) {
            // flatten node if necessary
            if (RubyChildAnalyzer.isAtomicRubyElement(children.item(i))) {
                RubyShim.flatten(children.item(i), rubyNode);
            } else if (RubyChildAnalyzer.isContainerRubyElement(children.item(i))) {
                RubyPreprocessor.preprocessContainer(children.item(i), rubyNode);
            }
            // preprocess container elements
            if (RubyChildAnalyzer.isNestedRubyElement(children.item(i))) {
                RubyPreprocessor.preprocess(children.item(i));
            } else if (RubyChildAnalyzer.isContainerRubyElement(children.item(i))) {
                RubyPreprocessor.preprocessContainer(children.item(i));
            }
            // rebuild phase
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
