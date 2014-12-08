/*jslint plusplus: true */

(function () { "use strict";
    // debug output to document
    var rubyNode, ns, doc;
    function nodeString(node) {
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
    doc = document;
    rubyNode = doc.getElementsByTagName("ruby")[0];
    ns = nodeString(rubyNode);
    document.getElementById("treebox").innerHTML = ns;
    }()
);
