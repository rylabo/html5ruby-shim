/*jslint plusplus: true, continue: true, debug: true */
/*global console */

(function () { "use strict";
    var RubyChildAnalyzer = {},
        RubyPreprocessor = {},
        RubyShim = {},
        RTCNodeProcessor = {},
        RubyProcessor = {},
        SegmentProcessor = {},
        rubyNode,
        rubyChildren,
        rubySegs,
        ns,
        i,
        j,
        newRubyNode;

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

    // Segment Processor Definition

    // two stages... process, and collapse
    SegmentProcessor.process = function (rubySegment) {
        // find the max and minimum number of annotations in a container
        // pad base container of necessary
        // set ruby span on final annotations in each container
        var bases = rubySegment.bases,
            annotationContainers = rubySegment.annotationContainers, // array
            maxContainerLength,
            minContainerLength,
            additionalBasesNeeded,
            requiredSpan,
            currentAnnotation,
            index;

        maxContainerLength = function (containers) {
            var val = null,
                index;

            for (index = 0; index < containers.length; index++) {
                if (!val) {
                    val = containers[index].annotationList.length;
                    continue;
                }
                if (containers[index].annotationList.length > val) {
                    val = containers[index].annotationList.length;
                }
            }
            return val;
        };

        minContainerLength = function (containers) {
            var val = null,
                index;

            for (index = 0; index < containers.length; index++) {
                if (!val) {
                    val = containers[index].annotationList.length;
                    continue;
                }
                if (containers[index].annotationList.length < val) {
                    val = containers[index].annotationList.length;
                }
            }
            return val;
        };

        additionalBasesNeeded = maxContainerLength(annotationContainers) - bases.length;

        for (index = 0; index < additionalBasesNeeded; index++) {
            rubySegment.bases.push(document.createElement("rb")); // push an empty base node
        } // now should have a number of bases
        // TODO make all segments have equal number of annotation containers
        bases = rubySegment.bases;
        for (index = 0; index < annotationContainers.length; index++) {
            requiredSpan = bases.length - annotationContainers[index].annotationList.length + 1;
            if (requiredSpan > 1) {
                // set object.style.rbspan =
                // TODO this doesn't actually work
                currentAnnotation = annotationContainers[index].annotationList.slice(-1).pop();
                currentAnnotation.style["column-span"] = requiredSpan;
            }
        }

        return rubySegment;
    };
    // returns a freshly minted single segment ruby node.
    SegmentProcessor.collapseIntoNode = function (rubySegments) {
        var newNode = document.createElement("ruby"),
            bases = [],
            annotationContainers = [],
            index,
            index2,
            maxContainers,
            annotationLevel,
            maxLevels,
            neededContainers,
            fillerAnnotation,
            newAnnotationNode;
        // concatenate all ruby base arrays into a single base array, and all same level annotation containers
        // TODO search through segments to determine the highest annotation level.

        maxContainers = function (rubySegments) {
            var val = null,
                index;

            for (index = 0; index < rubySegments.length; index++) {
                if (!val) {
                    val = rubySegments[index].annotationContainers.length;
                    continue;
                }
                if (rubySegments[index].annotationContainers.length > val) {
                    val = rubySegments[index].annotationContainers.length;
                }
            }
            return val;
        };

        // initialize our annotation containers
        maxLevels = maxContainers(rubySegments);
//        debugger;
        for (index = 0; index < maxLevels; index++) {
            annotationContainers.push({annotationList: [], range : null});
        }

        // add container fillers into ruby segments if necessary
        for (index = 0; index < rubySegments.length; index++) {
            // make sure all segments contain the correct number containers
            neededContainers = maxLevels - rubySegments[index].annotationContainers.length;
            for (annotationLevel = rubySegments[index].annotationContainers.length; annotationLevel < maxLevels; annotationLevel++) { //WRONG!
//                window.alert("creating a filler container");
                fillerAnnotation = document.createElement("rt");
                fillerAnnotation.style["column-span"] = rubySegments[index].bases.length;
                rubySegments[index].annotationContainers.push({annotationList: [], range : null});
                rubySegments[index].annotationContainers[annotationLevel].annotationList.push(fillerAnnotation);
            }
        }
        // now should have all segments containing the same number of annotation levels
        for (index = 0; index < rubySegments.length; index++) {
            bases = bases.concat(rubySegments[index].bases);
            for (annotationLevel = 0; annotationLevel < rubySegments[index].annotationContainers.length; annotationLevel++) {
                annotationContainers[annotationLevel].annotationList = annotationContainers[annotationLevel].annotationList.concat(rubySegments[index].annotationContainers[annotationLevel].annotationList);
            }
        }

        // post conditions: should have bases containing a giant list of all ruby bases,
        // and a set of containers. Begin ruby node construction:

        for (index = 0; index < bases.length; index++) {
            if (RubyChildAnalyzer.isTextNode(bases[index])) {
                newNode.appendChild(RubyShim.wrapChildWithNewElement(bases[index], "rb"));
            } else {
                newNode.appendChild(bases[index]);
            }
        }
        // now create proper annotation container nodes, and append those

        for (index = 0; index < maxLevels; index++) {
            newAnnotationNode = document.createElement("rtc");
            for (index2 = 0; index2 < annotationContainers[index].annotationList.length; index2++) {
                newAnnotationNode.appendChild(annotationContainers[index].annotationList[index2]);
            }
            newNode.appendChild(newAnnotationNode);
        }
        return newNode;
    };
    // RTC Node Processor Definition

    RTCNodeProcessor = function (rtcNode) {
        this.root = rtcNode;
        this.annotations = [];
        this.currentAutomaticAnnotationNodes = [];
        this.currentAutomaticAnnotationRangeStart = null;
        this.children = this.root.childNodes;

        this.commitAutomaticAnnotation = function (index) {
            if (this.currentAutomaticAnnotationNodes.length === 0) {
                return;
            }
            for (i = 0; i < this.currentAutomaticAnnotationNodes.length; i++) {
                if (!RubyChildAnalyzer.isEmptyTextContainerNode(this.currentAutomaticAnnotationNodes[i])) {
                    this.annotations = this.annotations.concat(this.currentAutomaticAnnotationNodes);
                    break;
                }
            }


            this.currentAutomaticAnnotationNodes = [];
            this.currentAutomaticAnnotationRangeStart = null;
        };

        var currentChild, i;
        for (i = 0; i < this.children.length; i++) {
            currentChild = this.children.item(i);
            // TODO code rest of construction code
            if (RubyChildAnalyzer.isElementWithTag(currentChild, "rt")) {
                this.commitAutomaticAnnotation(i);
                this.annotations.push(currentChild);
                continue;
            }
            if (this.currentAutomaticAnnotationNodes.length === 0) {
                this.currentAutomaticAnnotationRangeStart = i;
            }
            this.currentAutomaticAnnotationNodes.push(currentChild);
        }

    }; // end of RTC Node Processor Definition

    RTCNodeProcessor.getDescriptor = function (rtcNode) {
        var rtcProcessor = new RTCNodeProcessor(rtcNode);
        return rtcProcessor.annotations;
    };

    // Ruby Processor Definition
    RubyProcessor = function (rubyNode) {
        this.root = rubyNode;
        this.rubySegments = [];
        this.currentBases = [];
        this.currentBasesRange = null;
        this.currentBasesRangeStart = null;
        this.currentAnnotations = [];
        this.currentAnnotationsRange = null;
        this.currentAnnotationsRangeStart = null;
        this.currentAnnotationContainers = [];
        this.currentAutomaticBaseRangeStart = null;
        this.currentAutomaticBaseNodes = [];
        this.children = this.root.childNodes;

        this.commitRubySegment = function (index) {
            this.commitAutomaticBase(index);
            if ((this.currentBases.length === 0) &&
                    (this.currentAnnotations.length === 0) &&
                    (this.currentAnnotationContainers.length === 0)) {
                return;
            }
            this.commitBaseRange(index);
            this.commitCurrentAnnotations(index);
            this.rubySegments.push({bases : this.currentBases,
                                    baseRange : this.currentBasesRange,
                                    annotationContainers : this.currentAnnotationContainers
                                   });
            this.currentBases = [];
            this.currentBasesRange = null;
            this.currentBasesRangeStart = null;
            this.currentAnnotationContainers = [];
        };

        this.commitAutomaticBase = function (index) {
            var i, j;
            if (this.currentAutomaticBaseNodes.length === 0) {
                return;
            }
            for (i = 0; i < this.currentAutomaticBaseNodes.length; i++) {
                if (!RubyChildAnalyzer.isEmptyTextContainerNode(this.currentAutomaticBaseNodes[i])) {
                    if (this.currentBases.length === 0) {
                        this.currentBaseRangeStart = this.currentAutomaticBaseRangeStart;
                    }
                    break;
                }
            }
            this.currentBases = this.currentBases.concat(this.currentAutomaticBaseNodes);
            this.currentAutomaticBaseNodes = [];
            this.currentAutomaticBaseRangeStart = null;
        };

        this.commitBaseRange = function (index) {
            if ((this.currentBases.length === 0) || !this.currentBasesRange) {
                return;
            }
            this.currentBasesRange = {start: this.currentBasesRangeStart, end: index};
        };

        this.commitCurrentAnnotations = function (index) {
            if ((this.currentAnnotations.length !== 0) && !this.currentAnnotationsRange) {
                this.currentAnnotationsRange = {start: this.currentAnnotationsRangeStart, end: index};
            }
            if (this.currentAnnotations.length !== 0) {
                this.currentAnnotationContainers.push({annotationList: this.currentAnnotations, range: this.currentAnnotationsRange});
            }

            this.currentAnnotations = [];
            this.currentAnnotationsRange = null;
            this.currentAnnotationsRangeStart = null;
        };

        // construction code

        var currentChild, lookaheadIndex, peekChild, loops = 0, i;
        // debugger;
        for (i = 0; i < this.children.length; i++) {
            loops += 1;
/*
            if (loops > 100) {
                debugger;
            }
*/
            currentChild = this.children.item(i);
            if ((currentChild.nodeType !== 1) && (currentChild.nodeType !== 3)) {
                continue;
            }

            if (RubyChildAnalyzer.isElementWithTag(currentChild, "rp")) {
                continue;
            }

            if (RubyChildAnalyzer.isElementWithTag(currentChild, "rt")) {
                this.commitAutomaticBase(i);
                this.commitBaseRange(i);
                if (this.currentAnnotations.length === 0) {
                    this.currentAnnotationsRangeStart = i;
                }
                this.currentAnnotations.push(currentChild);
                continue;
            }

            if (RubyChildAnalyzer.isElementWithTag(currentChild, "rtc")) {
                this.commitAutomaticBase(i);
                this.commitBaseRange(i);
                this.commitCurrentAnnotations(i);
                this.currentAnnotationContainers.push({annotationList: RTCNodeProcessor.getDescriptor(currentChild),
                                                       range: {start: i, end: i + 1}});
                continue;
            }

            if (RubyChildAnalyzer.isEmptyTextContainerNode(currentChild)) {
                if (this.currentAnnotations.length !== 0) {
                    continue;
                }

                lookaheadIndex = i + 1;
                peekChild = this.children.item(lookaheadIndex);
                while (lookaheadIndex < this.children.length && peekChild && RubyChildAnalyzer.isEmptyTextContainerNode(peekChild)) {
                    lookaheadIndex += 1;
                    peekChild = this.children.item(lookaheadIndex);
                }
                if (RubyChildAnalyzer.isElementWithTag(peekChild, "rt") ||
                        RubyChildAnalyzer.isElementWithTag(peekChild, "rtc") ||
                        RubyChildAnalyzer.isElementWithTag(peekChild, "rp")) {
                    i = lookaheadIndex - 1;
                    continue;
                }
            }

            if ((this.currentAnnotations.length !== 0) ||
                    (this.currentAnnotationContainers.length !== 0)) {
                this.commitRubySegment(i);
            }

            if (RubyChildAnalyzer.isElementWithTag(currentChild, "rb")) {
                this.commitAutomaticBase(i);
                if (this.currentBases.length === 0) {
                    this.currentBasesRangeStart = i;
                }
                this.currentBases.push(currentChild);
                continue;
            }

            if (this.currentAutomaticBaseNodes.length === 0) {
                this.currentAutomaticBaseRangeStart = i;
            }
//            console.log("pushing child onto bases: " + currentChild);
            this.currentAutomaticBaseNodes.push(currentChild);
        } // for
        this.commitRubySegment(this.children.length);
        // end construction code
    }; // end of class def

    RubyProcessor.getDescriptor = function (rubyNode) {
        var rubyProcessor = new RubyProcessor(rubyNode),
            rubySegments = rubyProcessor.rubySegments;
//        rubyProcessor = null;
        return rubySegments;
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

    RubyChildAnalyzer.isElementWithTag = function (DOMelement, tagName) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === tagName);
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
//                while () {
                    // TODO keep adding nodes until you hit a bad end tag, or a whitelisted element type. Types include
                    // span, a, link,
//                }
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
//    console.log(rubyChildren);
    for (i = 0; i < rubyChildren.length; i++) {
        rubyNode = rubyChildren[i];
        rubyNode = RubyPreprocessor.preprocess(rubyNode);
    }
//    console.log(rubyChildren);
    for (i = 0; i < rubyChildren.length; i++) {
        rubyNode = rubyChildren[i];
        rubySegs = RubyProcessor.getDescriptor(rubyNode);
        for (j = 0; j < rubySegs.length; j++) {
            SegmentProcessor.process(rubySegs[j]);
        }
        newRubyNode = SegmentProcessor.collapseIntoNode(rubySegs);
        rubyChildren[i].parentElement.replaceChild(newRubyNode, rubyChildren[i]);
//        console.log(JSON.stringify(rubySegs));
    }

    }()
);
