/*jslint plusplus: true */
/*global console */
function testRuby() {
    'use strict';
    var tbox = document.getElementById("treebox"),
        rbox = document.getElementById("rubybox"),
        content = "<ruby>" +
            "<rbc><rb>五十</rb><rb>四</rb><rb>歩</rb></rbc>" +
            "<rtc><rt>ゴジュ－</rt><rt>シ</rt><rt>ホ</rt></rtc>" +
            "<rtc></rtc>" +
            "</ruby>",
        rubyContent;
    rbox.innerHTML = content;
    rubyContent = rbox.getElementsByTagName('ruby')[0].getElementsByTagName('rtc')[0];
    if (!rubyContent.getElementsByTagName('rt')[0]) {
        return false;
    }
    return true;
}
var i;
var val = testRuby();
var rstr = val + "\ncontent:\n" + document.getElementById("rubybox").innerHTML;
var children = document.getElementsByTagName("ruby")[0].childNodes;
//console.log(children.length);
document.getElementById("treebox").innerHTML = children.length;
var child;
var tagString = '';

function rubyIE8BaseShim(rubyNode) {
    'use strict';
    var children = rubyNode.childNodes,
        child,
        newNode,
        i;
    for (i = 0; i < children.length; i++) {
        child = children.item(i);
        if ((child.nodeType === 3) && (i === 0)) { // implicit rb node
            newNode = document.createElement("rb");
            newNode.appendChild(child);
            rubyNode.replaceChild(newNode, children.item(i));
        } else if ((child.nodeType !== 3) &&
                (child.tagName.toLowerCase() === "rb") &&
                (child.childNodes.length === 0) &&
                (child.nextSibling.nodeType === 3)) { // empty rb node followed by a text node.. semantically an rb node
            newNode = document.createElement("rb");
            newNode.appendChild(child.nextSibling);
            rubyNode.replaceChild(newNode, children.item(i));
        } else if ((child.nodeType !== 3) &&
                (child.tagName.toLowerCase() === "rtc") &&
                (child.childNodes.length === 0)) { // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
            newNode = document.createElement("rtc");
            while (child.nextSibling && child.nextSibling.tagName.toLowerCase() === "rt") {
                newNode.appendChild(child.nextSibling);
            }
            rubyNode.replaceChild(newNode, children.item(i));
        } else if ((child.nodeType !== 3) &&
                ((child.tagName.toLowerCase() === "/rtc") ||
                (child.tagName.toLowerCase() === "/rb") ||
                (child.tagName.toLowerCase() === "/rbc"))) { // trim off "bad closing tag elements created by IE8"
            rubyNode.removeChild(children.item(i));
            i--;
        }
    }
    return rubyNode;
}

function containsNoElement(rubyNode) {
}

(function () { "use strict";
    var RubyChildAnalyzer, RubyPreprocessor;
    RubyPreprocessor.prototype.preprocess = function (rubyNode) {

    };
    RubyChildAnalyzer.prototype.isTextNode = function (DOMelement) {
        return DOMelement.nodeType === 3;
    };
    RubyChildAnalyzer.prototype.isEmptyBaseNodeThenTextNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length === 0) &&
            (DOMelement.nextSibling.nodeType === 3);
    };
    RubyChildAnalyzer.prototype.isBadIE8ClosingTagNode = function (DOMelement) {
        // IE8 mishandles rb and rtc tags when reading HTML, creating empty RB nodes and empty nodes tagged "/RB"
        return !this.isTextNode(DOMelement) &&
            ((DOMelement.tagName.toLowerCase() === "/rtc") ||
            (DOMelement.tagName.toLowerCase() === "/rb") ||
            (DOMelement.tagName.toLowerCase() === "/rbc"));
    };
    RubyChildAnalyzer.prototype.isEmptyTextContainerNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rtc") &&
            (DOMelement.childNodes.length === 0) &&
            (DOMelement.nextSibling.nodeType === 3);
    };

    RubyChildAnalyzer.prototype.containsNoNodeWithTag = function (tagName) {
        // check out what characterizes this ruby node. Used to determine if it is a simple ruby or complex one
    };
    }()
);

function nodeString(node) {
    'use strict';
    var str = (node.nodeType === 3) ? "textNode: '" + node.nodeValue + "'" : node.tagName,
        children = node.childNodes,
        childStrs = [],
        i;

    if (children.length === 0) {
        //str += "\n";
        return str;
    } else {
        //str += "[\n";
        for (i = 0; i < children.length; i++) {
            str += "[" + nodeString(children.item(i)) + "]";
        }
        //str += "]\n";
        return str;
    }
}
for (i = 0; i < children.length; i++) {
    child = children.item(i);
    if (child.nodeType === 3) {
        tagString += "textNode: '" + child.nodeValue + "'\n";
    } else {
        tagString += child.tagName + "\n";
    }
}
var rubyNode = document.getElementsByTagName("ruby")[0];
rubyNode = rubyIE8BaseShim(rubyNode);
var ns = nodeString(rubyNode);
//console.log(ns);
//console.log(document.getElementsByTagName("ruby")[0].childNodes.length);
document.getElementById("treebox").innerHTML = ns;
