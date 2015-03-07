/*jslint plusplus: true, continue: true, debug: true */
/*global console */

(function () { "use strict";
    var NodeInspector = {},
        RubyPreprocessor = {},
        RubyDOMRebuilder = {},
        AnnotationContainerDescriptorBuilder = {},
        RubyDescriptorBuilder = {},
        SegmentProcessor = {},
        ArrayValuation,
        RubyLayoutManager,
        BaseDescriptor,
        AnnotationDescriptor,
        RubySegment,
        AnnotationContainer,
        rubyNode,
        rubyChildren,
        rubySegs,
        ns,
        i,
        j,
        layout,
        newRubyNode;

    function htmlCollectionToArray(collection) {
        var index,
            newArray = [];
        for (index = 0; index < collection.length; index++) {
            newArray.push(collection[index]);
        }
        return newArray;
    }

    /************************************************
    * ArrayValuation Class Definition
    ************************************************/

    ArrayValuation = function (array, valuationFunction) {
        var valuation = array.map(valuationFunction);
        this.getValuation = function () { return valuation; };
    };

    ArrayValuation.prototype.getMax = function () { return Math.max.apply(null, this.getValuation()); };
    ArrayValuation.prototype.getMin = function () { return Math.min.apply(null, this.getValuation()); };
    ArrayValuation.prototype.getTotal = function () {
        var valuation = this.getValuation(),
            summation = function (a, b) {return a + b; },
            value = 0;

        if (valuation.length === 1) {
            value = valuation[0];
        } else if (valuation.length > 1) {
            value = this.getValuation().reduce(summation);
        }
        return value;
    };


    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    /************************************************
    * RubyLayoutManager Class Definition
    ************************************************/

    RubyLayoutManager = function (rubyElement, rubySegments) {
        var annotationContainers,
            RubyPositioningManager,
            RubyAlignmentManager,
            RubyMergingManager,
            RubyEdgeManager,
            positioningManager,
            alignmentManager,
            mergingManager,
            edgeManager;

        /************************************************
        * RubyLayoutManager.RubyPositioningManager Class Definition
        ************************************************/

        RubyPositioningManager = function (rubyElement) {
            //TODO implement annotation container stacking
            var annotationContainers,

                // PRIVATE METHODS
                getAnnotationContainerHeight,
                separateAnnotationContainers,
                calculateNeededVerticalSpace,
                normalizeContainerHeights,
                stackAnnotationContainers,
                expandRubyElementHeight;

            getAnnotationContainerHeight = function (annotationContainer) {
                var annotationHeights,
                    annotationElements,
                    annotationHeight;
                annotationHeight = function (rubyAnnotation) {
                    var height = window.getComputedStyle(rubyAnnotation).height;
                    return parseInt(height, 10);
                };
                annotationElements = htmlCollectionToArray(annotationContainer.getElementsByTagName("rt"));
                annotationHeights = new ArrayValuation(annotationElements, annotationHeight);
                return annotationHeights.getMax();
            };

            separateAnnotationContainers = function (annotationContainers) {
                var aContainers = {above : [], below : []},
                    position,
                    index;
                for (index = 0; index < annotationContainers.length; index++) {
                    position = annotationContainers[index].getAttribute("data-ruby-position").split(" ");
                    if ((position[0].toLowerCase() === "above") || (position[1].toLowerCase() === "above")) {
                        aContainers.above.push(annotationContainers[index]);
                    } else if ((position[0].toLowerCase() === "below") || (position[1].toLowerCase() === "below")) {
                        aContainers.below.push(annotationContainers[index]);
                    } else {
                        if (index === 0) {
                            aContainers.above.push(annotationContainers[index]);
                        } else {
                            aContainers.below.push(annotationContainers[index]);
                        }
                    }
                }

                return aContainers;
            };

            calculateNeededVerticalSpace = function (annotationContainers) {
                var sortedContainers = separateAnnotationContainers(annotationContainers),
                    topAnnotationHeights = new ArrayValuation(sortedContainers.above, getAnnotationContainerHeight),
                    bottomAnnotationHeights = new ArrayValuation(sortedContainers.below, getAnnotationContainerHeight),
                    value = {top : topAnnotationHeights.getTotal(), bottom : bottomAnnotationHeights.getTotal()};
                // now calculate how much space above and below we need. This will be our margins
                // expandRubyElementHeight
                sortedContainers = null;
                topAnnotationHeights = null;
                bottomAnnotationHeights = null;
                return value;
            };

            normalizeContainerHeights = function (annotationContainers) {
                var index;
                for (index = 0; index < annotationContainers.length; index++) {
                    annotationContainers[index].style.height = getAnnotationContainerHeight(annotationContainers[index]) + "px";
                }
            };

            expandRubyElementHeight = function (rubyElement) {
                var annotationContainers = htmlCollectionToArray(rubyElement.getElementsByTagName("rtc")),
                    neededVerticalSpace = calculateNeededVerticalSpace(annotationContainers);
                normalizeContainerHeights(annotationContainers);
                rubyElement.style.paddingTop = neededVerticalSpace.top + "px";
                rubyElement.style.paddingBottom = neededVerticalSpace.bottom + "px";
            };

            // initialization code
            expandRubyElementHeight(rubyElement);

        };

        /************************************************
        * RubyLayoutManager.RubyAlignmentManager Class Definition
        ************************************************/

        RubyAlignmentManager = function (rubySegments) {
            var AlignmentBlock,
                AlignmentColumn,
                AlignerFactory,
                columns = [],
                spannedBasesCount, // function that counts how many bases are spanned
                getMaxTotalWidth, // measures the horizontal space a group of elements take up, including margin space
                addSpacing,

                getAligningColumns,
                getBaseElement,
                getAnnotationElement,
                getElementFromDescriptor,
                getElementRow,
                getBaseArray,
                getAnnotationArray,
                toRowMatrix,
                toColumnMatrix;

            /************************************************
            * RubyLayoutManager.RubyAlignmentManager.AlignerFactory Class Definition
            ************************************************/

            AlignerFactory = (function () {
                var CenterAlignment = (function () {
                        return {
                            widen : function (alignmentBlock, newWidth) {
                                var blockContents = alignmentBlock.getContents(),
                                    width = newWidth - alignmentBlock.getWidth(),
                                    expandLeft = width / 2,
                                    expandRight = width / 2,
                                    firstElement = blockContents[0].node,
                                    lastElement = blockContents[blockContents.length - 1].node,
                                    firstElementLeftMargin = parseInt(window.getComputedStyle(firstElement).marginLeft, 10),
                                    lastElementRightMargin = parseInt(window.getComputedStyle(lastElement).marginRight, 10);

                                firstElement.style.marginLeft = (firstElementLeftMargin + expandLeft) + "px";
                                lastElement.style.marginRight = (lastElementRightMargin + expandRight) + "px";
                            }
                        };
                    }()),

                    SpaceBetweenAlignment = (function () {
                        return {
                            widen : function (alignmentBlock, newWidth) {
                                throw new Error("widening function not implemented.");
                            }
                        };
                    }()),

                    SpaceAroundAlignment = (function () {
                        return {
                            widen : function (alignmentBlock, newWidth) {
                                throw new Error("widening function not implemented.");
                            }
                        };
                    }()),

                    StartAlignment = (function () {
                        return {
                            widen : function (alignmentBlock, newWidth) {
                                throw new Error("widening function not implemented.");
                            }
                        };
                    }()),

                    alignments = {
                        "center" : CenterAlignment,
                        "space-between" : SpaceBetweenAlignment,
                        "start" : StartAlignment,
                        "space-around" : SpaceAroundAlignment
                    };

                return {
                    getAlignment : function (alignStyle) {
                        return alignments[alignStyle];
                    }
                };
            }());

            /************************************************
            * RubyLayoutManager.RubyAlignmentManager.AlignmentBlock Class Definition
            ************************************************/

            AlignmentBlock = function (descriptors, alignStyle) {
                // accepts either an array or a single of descriptors

                var contents = descriptors;
                this.aligner = AlignerFactory.getAlignment("center").widen;

                this.getWidth = function () {
                    var index,
                        widthTotal = 0,
                        elementStyle;
                    // we want to find the total width of all elements within the array.
                    for (index = 0; index < contents.length; index++) {
                        elementStyle = window.getComputedStyle(contents[index].node);
                        widthTotal += contents[index].node.offsetWidth +
                            parseInt(elementStyle.marginLeft, 10) +
                            parseInt(elementStyle.marginRight, 10);
                    }
                    return widthTotal;
                };

                this.getContents = function () {
                    return contents;
                };
            };


            AlignmentBlock.prototype.expandWidth = function (newWidth) {
                this.aligner.call(this, this, newWidth);
            };

            /************************************************
            * RubyLayoutManager.RubyAlignmentManager.AlignmentColumn Class Definition
            ************************************************/

            AlignmentColumn = function (descriptorColumn, alignStyle) {
                var blocks = [],
                    optimalWidth,
                    index;

                function getOptimalWidth(alignmentBlocks) {
                    function getBlockWidth(alignmentBlock) {
                        return alignmentBlock.getWidth();
                    }
                    var widthValues = new ArrayValuation(alignmentBlocks, getBlockWidth);
                    return widthValues.getMax();
                }

                for (index = 0; index < descriptorColumn.length; index++) {
                    blocks.push(new AlignmentBlock(descriptorColumn[index], alignStyle));
                }

                optimalWidth = getOptimalWidth(blocks);

                for (index = 0; index < blocks.length; index++) {
                    blocks[index].expandWidth(optimalWidth);
                }
            };

            toRowMatrix = function (rubySegment) {
                var rows = [],
                    index;
                rows.push(rubySegment.bases);
                for (index = 0; index < rubySegment.annotationContainers.length; index++) {
                    rows.push(rubySegment.annotationContainers[index].annotationList);
                }
                return rows;
            };

            toColumnMatrix = function (rubySegment) {
                var rows = toRowMatrix(rubySegment),
                    columnIndex,
                    rowIndex,
                    columns = [],
                    newColumn;

                for (columnIndex = 0; columnIndex < rows[0].length; columnIndex++) {
                    newColumn = [];
                    for (rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                        if (columnIndex < rows[rowIndex].length) {
                            newColumn.push(rows[rowIndex][columnIndex]);
                        }
                    }
                    columns.push(newColumn);
                }

                return columns;
            };

            getAligningColumns = function (rubySegment) {
                var singleWidthColumns = [],
                    columns,
                    rows,
                    segmentWidth,
                    annotationContainerWidth,
                    rowIndex,
                    columnIndex,
                    aligningColumns = [],
                    aligningColumn,
                    getIndexSpan,
                    spanWidth,
                    getSpanningAlignmentColumn,
                    aligningBlock;

                columns = toColumnMatrix(rubySegment);
                rows = toRowMatrix(rubySegment);
                segmentWidth = rubySegment.bases.length;

                getSpanningAlignmentColumn = function (rowMatrix, size) {
                    var index,
                        rowFragment,
                        alignmentColumn = [],
                        matrixWidth = rowMatrix[0].length,
                        sliceIndex = matrixWidth - size,

                        hasSpanningAlignmentBlock = function (alignmentColumn) {
                            for (index = 0; index < alignmentColumn.length; index++) {
                                // checks for the presence of a single element
                                if (alignmentColumn[index].length === 1) {
                                    return true;
                                }
                            }
                            return false;
                        };

                    for (index = 0; index < rowMatrix.length; index++) {
                        rowFragment = rowMatrix[index].slice(sliceIndex);
                        if (rowFragment.length !== 0) {
                            alignmentColumn.push(rowFragment);
                        }
                    }

                    if (hasSpanningAlignmentBlock(alignmentColumn)) {
                        return alignmentColumn;
                    }
                    // else
                    return null;
                };
                // organize single spanning columns first

                for (columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                    aligningColumn = [];
                    for (rowIndex = 0; rowIndex < columns[columnIndex].length; rowIndex++) {
                        if (!columns[columnIndex][rowIndex].span || columns[columnIndex][rowIndex].span.length === 1) {
                            aligningBlock = [];
                            aligningBlock.push(columns[columnIndex][rowIndex]);
                            aligningColumn.push(aligningBlock);
                        }
                    }
                    aligningColumns.push(new AlignmentColumn(aligningColumn));
                }

                // now gatherup the multi spanning elements

                for (spanWidth = 2; spanWidth <= segmentWidth; spanWidth++) {
                    aligningColumn = getSpanningAlignmentColumn(rows, spanWidth);
                    if (aligningColumn) {
                        aligningColumns.push(new AlignmentColumn(aligningColumn));
                    }
                }

                return aligningColumns;
            };
            // begin initialization
            function init() {
                var index;
                for (index = 0; index < rubySegments.length; index++) {
                    columns = columns.concat(getAligningColumns(rubySegments[index]));
                }
            }
            init();
        };
        positioningManager = new RubyPositioningManager(rubyElement);
        alignmentManager = new RubyAlignmentManager(rubySegments);
    };

    /************************************************
    * RubyDOMRebuilder Class Definition
    ************************************************/

    RubyDOMRebuilder.nextNonWhitespaceSibling = function (subNode) {
        if (subNode.nextSibling && NodeInspector.isWhitespaceNode(subNode.nextSibling)) {
            return RubyDOMRebuilder.nextNonWhitespaceSibling(subNode.nextSibling);
        }
        // else
        return subNode.nextSibling;
    };

    RubyDOMRebuilder.wrapChildWithNewElement = function (child, newElementTag) {
        var newNode = document.createElement(newElementTag);
        newNode.appendChild(child);
        return newNode;
    };

    RubyDOMRebuilder.wrapChildInNewElementAndPrepend = function (rubyNode, child, newElementTag) {
        var newNode = RubyDOMRebuilder.wrapChildWithNewElement(child, newElementTag);
        rubyNode.insertBefore(newNode, rubyNode.firstChild);
        return rubyNode;
    };

    RubyDOMRebuilder.buildNewTextContainerNode = function (child) {
        var newNode = document.createElement("rtc"),
            newRubyTextNode;
        while (child.nextSibling && !(NodeInspector.isTextContainerDelimiter(child.nextSibling))) {
            if (NodeInspector.isTextNode(child.nextSibling)) {
                newNode.appendChild(RubyDOMRebuilder.wrapChildWithNewElement(child.nextSibling, "rt"));
            } else {
                newNode.appendChild(child.nextSibling);
            }
        }
        return newNode;
    };

    RubyDOMRebuilder.appendToContainerNode = function (rubyNode, containerNode, child) {
        var nextChild, newNode;
        if (!child) {
            return containerNode;
        }
        nextChild = RubyDOMRebuilder.nextNonWhitespaceSibling(child);
        if (NodeInspector.isNonEmptyBaseNode(child)) {
            containerNode.appendChild(child);
        } else if (NodeInspector.isEmptyBaseNodeThenTextNode(child)) {
            // we eventually need to pull the loose empty base nodes from the ruby node
            newNode = RubyDOMRebuilder.wrapChildWithNewElement(RubyDOMRebuilder.nextNonWhitespaceSibling(child), "rb");
            nextChild = RubyDOMRebuilder.nextNonWhitespaceSibling(child);
            rubyNode.removeChild(child);
            containerNode.appendChild(newNode);
        } else if ((child.tagName.toLowerCase() === "rt") ||
                        (child.tagName.toLowerCase() === "rtc") ||
                        (child.tagName.toLowerCase() === "rp")) {
            return containerNode;
        }
        return RubyDOMRebuilder.appendToContainerNode(rubyNode, containerNode, nextChild);
    };

    RubyDOMRebuilder.buildNewBaseContainerNode = function (rubyNode, child) {
        var newNode = document.createElement("rbc"),
            nextChild = RubyDOMRebuilder.nextNonWhitespaceSibling(child);
        if (NodeInspector.isTextNode(nextChild)) {
            newNode.appendChild(RubyDOMRebuilder.wrapChildWithNewElement(nextChild, "rb"));
        }
        return RubyDOMRebuilder.appendToContainerNode(rubyNode, newNode, nextChild);
    };

    RubyDOMRebuilder.flatten = function (DOMelement, DOMparent) {
        // rb, rt, rp, rtc
        var i = 0,
            j = 0,
            branches = DOMelement.childNodes;

        for (i = 0; i < branches.length; i++) {
            if (NodeInspector.isRubyChildDelimiter(branches.item(i))) {
                // TODO pull out all elements and insert after and including this element within the parent
                for (j = branches.length - 1; j >= i; j--) {
                    DOMparent.insertBefore(branches.item(j), DOMelement.nextSibling);
                }
                return;
            }
        }
    };

    RubyDOMRebuilder.flattenContainer = function (DOMelement, DOMparent) {
        // rb, rt, rp, rtc
        var i = 0,
            j = 0,
            branches = DOMelement.childNodes;

        for (i = 0; i < branches.length; i++) {
            if (NodeInspector.isTextContainerDelimiter(branches.item(i))) {
                // TODO pull out all elements and insert after and including this element within the parent
                for (j = branches.length - 1; j >= i; j--) {
                    DOMparent.insertBefore(branches.item(j), DOMelement.nextSibling);
                }
                return;
            }
        }

    };

    /************************************************
    * BaseDescriptor Class Definition
    ************************************************/

    BaseDescriptor = function (baseNode) {
        // check if this is a text node, if it is, wrap it.
        if (baseNode.nodeType === 3) {
            this.node = RubyDOMRebuilder.wrapChildWithNewElement(baseNode, "rb");
        } else {
            this.node = baseNode;
        }
        this.annotations = [];
    };
    BaseDescriptor.prototype.addAnnotation = function (annotationNode) {
        this.annotations.push(annotationNode);
    };

    /************************************************
    * AnnotationDescriptor Class Definition
    ************************************************/

    AnnotationDescriptor = function (annotationNode) {
        if (annotationNode.nodeType === 3) {
            this.node = RubyDOMRebuilder.wrapChildWithNewElement(annotationNode, "rt");
        } else {
            this.node = annotationNode;
        }
        this.annotations = [];
        this.span = [];
    };
    AnnotationDescriptor.prototype.addSpannedBase = function (baseNode) {
        this.span.push(baseNode);
    };

    /************************************************
    * SegmentProcessor Class Definition
    ************************************************/

    // Normalizes and pairs ruby segment, then rebuilds the DOM node based on the pairings

    SegmentProcessor.process = function (rubySegment) {
        var bases = rubySegment.bases,
            annotationContainers = rubySegment.annotationContainers, // array
            containerLengths,
            maxContainerLength,
            minContainerLength,
            additionalBasesNeeded,
            requiredSpan,
            currentAnnotation,
            index,
            index2,
            index3,
            last;

        function containerLength(container) {
            return container.annotationList.length;
        }

        function padWithBases(rubySegment, basesToAdd) {

            for (index = 0; index < basesToAdd; index++) {
                rubySegment.bases.push(document.createElement("rb")); // push an empty base node
            }

            return rubySegment.bases;
        }

        containerLengths = new ArrayValuation(annotationContainers, containerLength);

        additionalBasesNeeded = containerLengths.getMax() - bases.length;
        bases = padWithBases(rubySegment, additionalBasesNeeded);

        for (index = 0; index < annotationContainers.length; index++) {
            for (index2 = 0; index2 < bases.length; index2++) {
                if (index2 >= annotationContainers[index].annotationList.length) {
                    last = annotationContainers[index].annotationList.length - 1;
                    for (index3 = index2; index3 < bases.length; index3++) {
                        bases[index3].addAnnotation(annotationContainers[index].annotationList[last].node);
                        annotationContainers[index].annotationList[last].addSpannedBase(bases[index3].node);
                    }
                    break;
                }
                bases[index2].addAnnotation(annotationContainers[index].annotationList[index2].node);
                annotationContainers[index].annotationList[index2].addSpannedBase(bases[index2].node);
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
            annotationLevels,
            maxLevels,
            getSegmentAnnotationLevels,
            neededContainers,
            fillerAnnotation,
            newAnnotationNode;

        getSegmentAnnotationLevels = function (rubySegment) {
            return rubySegment.annotationContainers.length;
        };

        annotationLevels = new ArrayValuation(rubySegments, getSegmentAnnotationLevels);

        maxLevels = annotationLevels.getMax();
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
                rubySegments[index].annotationContainers[annotationLevel].annotationList.push(new AnnotationDescriptor(fillerAnnotation));
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
            if (NodeInspector.isTextNode(bases[index].node)) {
                newNode.appendChild(RubyDOMRebuilder.wrapChildWithNewElement(bases[index].node, "rb"));
            } else {
                newNode.appendChild(bases[index].node);
            }
        }
        // now create proper annotation container nodes, and append those

        for (index = 0; index < maxLevels; index++) {
            newAnnotationNode = document.createElement("rtc");
            // TODO add some logic to apply ruby positioning styling if not present
            if (index === 0) {
                newAnnotationNode.setAttribute("data-ruby-position", "above right");
            } else {
                newAnnotationNode.setAttribute("data-ruby-position", "below left");
            }
            for (index2 = 0; index2 < annotationContainers[index].annotationList.length; index2++) {
                newAnnotationNode.appendChild(annotationContainers[index].annotationList[index2].node);
            }
            newNode.appendChild(newAnnotationNode);
        }
        return newNode;

    };

    /************************************************
    * AnnotationContainerDescriptorBuilder Class Definition
    ************************************************/

    AnnotationContainerDescriptorBuilder = function (rtcNode) {
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
                if (!NodeInspector.isEmptyTextContainerNode(this.currentAutomaticAnnotationNodes[i])) {
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
            if (NodeInspector.isElementWithTag(currentChild, "rt")) {
                this.commitAutomaticAnnotation(i);
                this.annotations.push(new AnnotationDescriptor(currentChild));
                continue;
            }
            if (this.currentAutomaticAnnotationNodes.length === 0) {
                this.currentAutomaticAnnotationRangeStart = i;
            }
            this.currentAutomaticAnnotationNodes.push(new AnnotationDescriptor(currentChild));
        }
    }; // end of RTC Node Processor Definition

    AnnotationContainerDescriptorBuilder.getDescriptor = function (rtcNode) {
        var rtcProcessor = new AnnotationContainerDescriptorBuilder(rtcNode);
        return rtcProcessor.annotations;
    };

    /************************************************
    * RubySegment Class Definition
    ************************************************/

    RubySegment = function (baseContainer, annotationContainers) {
        return {
            bases: baseContainer,
            annotationContainers : annotationContainers
        };
    };

    /************************************************
    * AnnotationContainer Class Definition
    ************************************************/

    AnnotationContainer = function (annotations) {
        return {
            annotationList : annotations
        };
    };

    /************************************************
    * RubyBaseBuilder Class Definition
    ************************************************/

    /************************************************
    * RubyAnnotationBuilder Class Definition
    ************************************************/

    /************************************************
    * AnnotationContainerBuilder Class Definition
    ************************************************/

    /************************************************
    * RubyDescriptorBuilder Class Definition
    ************************************************/

    RubyDescriptorBuilder = function (rubyNode) {
        var currentChild,
            lookaheadIndex,
            peekChild,
            i,
        /************************************************
        * RubyDescriptorBuilder.SegmentBuilder Class Definition
        ************************************************/

            SegmentBuilder = function () {
                var currentBases = [],
                    currentAnnotations = [],
                    currentAnnotationContainers = [],
                    currentAutomaticBaseNodes = [];

                function commitAutomaticBase() {
                    var i;
                    if (currentAutomaticBaseNodes.length === 0) {
                        return;
                    }
                    for (i = 0; i < currentAutomaticBaseNodes.length; i++) {
                        if (!NodeInspector.isEmptyTextContainerNode(currentAutomaticBaseNodes[i].node)) {
                            break;
                        }
                    }
                    currentBases = currentBases.concat(currentAutomaticBaseNodes);
                    currentAutomaticBaseNodes = [];
                }

                function commitCurrentAnnotations() {
                    if (currentAnnotations.length !== 0) {
                        currentAnnotationContainers.push(new AnnotationContainer(currentAnnotations));
                    }
                    currentAnnotations = [];
                }

                this.add = function (containerType, container) {
                    switch (containerType) {
                    case "base":
                        commitAutomaticBase();
                        currentBases.push(container);
                        break;
                    case "automatic base":
                        currentAutomaticBaseNodes.push(container);
                        break;
                    case "annotation":
                        commitAutomaticBase();
                        currentAnnotations.push(container);
                        break;
                    case "annotation container":
                        commitAutomaticBase();
                        commitCurrentAnnotations();
                        currentAnnotationContainers.push(container);
                        break;
                    default:
                        throw new Error("Invalid container type specified");
                    }
                };

                this.build = function () {
                    var rubySegment;
                    commitAutomaticBase();
                    if ((currentBases.length === 0) &&
                            (currentAnnotations.length === 0) &&
                            (currentAnnotationContainers.length === 0)) {
                        return null;
                    }
                    commitCurrentAnnotations();
                    rubySegment = new RubySegment(currentBases, currentAnnotationContainers);
                    currentBases = [];
                    currentAnnotationContainers = [];
                    return rubySegment;
                };

                this.buildPending = function () {
                    return (currentAnnotations.length !== 0) ||
                        (currentAnnotationContainers.length !== 0);
                };
            },

            segmentBuilder = new SegmentBuilder();
        this.root = rubyNode;
        this.rubySegments = [];

        this.children = this.root.childNodes;

        this.commitRubySegment = function () {
            var segment = segmentBuilder.build();
            if (!segment) {
                return;
            }
            this.rubySegments.push(segment);
        };
        // construction code

        // debugger;
        for (i = 0; i < this.children.length; i++) {
            currentChild = this.children.item(i);
            if ((currentChild.nodeType !== 1) && (currentChild.nodeType !== 3)) {
                continue;
            }

            if (NodeInspector.isElementWithTag(currentChild, "rp")) {
                continue;
            }

            if (NodeInspector.isElementWithTag(currentChild, "rt")) {
                segmentBuilder.add("annotation", new AnnotationDescriptor(currentChild));
                continue;
            }

            if (NodeInspector.isElementWithTag(currentChild, "rtc")) {
                segmentBuilder.add(
                    "annotation container",
                    new AnnotationContainer(AnnotationContainerDescriptorBuilder.getDescriptor(currentChild))
                );
                continue;
            }

            if (NodeInspector.isEmptyTextContainerNode(currentChild)) {
                // if we're in the middle of a segment, just move to the next node
                if (this.currentAnnotations.length !== 0) {
                    continue;
                }

                // else we need to jump to the next actual node within the segment
                lookaheadIndex = i + 1;
                peekChild = this.children.item(lookaheadIndex);
                while (lookaheadIndex < this.children.length && peekChild && NodeInspector.isEmptyTextContainerNode(peekChild)) {
                    lookaheadIndex += 1;
                    peekChild = this.children.item(lookaheadIndex);
                }
                if (NodeInspector.isElementWithTag(peekChild, "rt") ||
                        NodeInspector.isElementWithTag(peekChild, "rtc") ||
                        NodeInspector.isElementWithTag(peekChild, "rp")) {
                    i = lookaheadIndex - 1;
                    continue;
                }
            }
            //iterator cutoff

            if (segmentBuilder.buildPending()) {
                this.commitRubySegment();  // Iterator would return the segment
            }

            if (NodeInspector.isElementWithTag(currentChild, "rb")) {
                segmentBuilder.add("base", new BaseDescriptor(currentChild));
                continue;
            }
            segmentBuilder.add("automatic base", new BaseDescriptor(currentChild));
        } // for
        this.commitRubySegment();
        // end construction code
    }; // end of class def

    RubyDescriptorBuilder.getDescriptor = function (rubyNode) {
        var descriptorBuilder = new RubyDescriptorBuilder(rubyNode),
            rubySegments = descriptorBuilder.rubySegments;
        descriptorBuilder = null;
        return rubySegments;
    };


    /************************************************
    * NodeInspector Class Definition
    ************************************************/

    NodeInspector.isTextNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && !(/^[\t\n\r ]+$/.test(DOMelement.nodeValue));
    };

    NodeInspector.isWhitespaceNode = function (DOMelement) {
        return DOMelement.nodeType === 3 && (/^[\t\n\r ]+$/.test(DOMelement.nodeValue));
    };

    NodeInspector.isEmptyBaseContainerNode = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rbc") &&
            (DOMelement.childNodes.length === 0);
    };

    NodeInspector.isRubyChildDelimiter = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rb") ||
             (DOMelement.tagName.toLowerCase() === "rt") ||
             (DOMelement.tagName.toLowerCase() === "rtc") ||
             (DOMelement.tagName.toLowerCase() === "rp"));

    };

    NodeInspector.isTextContainerDelimiter = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rb") ||
             (DOMelement.tagName.toLowerCase() === "rtc") ||
             (DOMelement.tagName.toLowerCase() === "rp"));
    };

    NodeInspector.isNonEmptyBaseNode = function (DOMelement) {
        // TODO check for telescoping
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length !== 0);
    };

    NodeInspector.isEmptyBaseNodeThenTextNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rb") &&
            (DOMelement.childNodes.length === 0) &&
            (RubyDOMRebuilder.nextNonWhitespaceSibling(DOMelement).nodeType === 3);
    };

    NodeInspector.isTelescopingNode = function (DOMelement) {
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

    NodeInspector.isTelescopingContainerNode = function (DOMelement) {
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

    NodeInspector.isAtomicRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "rt") ||
            (DOMelement.tagName.toLowerCase() === "rb") ||
            (DOMelement.tagName.toLowerCase() === "rp"));
    };

    NodeInspector.isAtomicRubyTextElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rt");
    };

    NodeInspector.isContainerRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rtc");
    };

    NodeInspector.isNestedRubyElement = function (DOMelement) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "ruby");
    };

    NodeInspector.isBadIE8ClosingTagNode = function (DOMelement) {
        // IE8 mishandles rb and rtc tags when reading HTML, creating empty RB nodes and empty nodes tagged "/RB"
        return (DOMelement.nodeType !== 3) &&
            ((DOMelement.tagName.toLowerCase() === "/rtc") ||
            (DOMelement.tagName.toLowerCase() === "/rb") ||
            (DOMelement.tagName.toLowerCase() === "/rbc"));
    };

    NodeInspector.isEmptyTextContainerNode = function (DOMelement) {
        // tests to see if the base node is empty but followed by a loose text node
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === "rtc") &&
            (DOMelement.childNodes.length === 0);
    };

    NodeInspector.isElementWithTag = function (DOMelement, tagName) {
        return (DOMelement.nodeType !== 3) &&
            (DOMelement.tagName.toLowerCase() === tagName);
    };


    /************************************************
    * RubyPreprocessor Class Definition
    ************************************************/

    RubyPreprocessor.preprocessContainer = function (containerNode, rubyNode) {
        var children = containerNode.childNodes,
            newNode,
            referenceNode,
            i,
            j;

        for (i = 0; i < children.length; i++) {
            if (NodeInspector.isTextNode(children.item(i))) {
                referenceNode = children.item(i).nextSibling;
                newNode = RubyDOMRebuilder.wrapChildWithNewElement(children.item(i), "rt");
                containerNode.insertBefore(newNode, referenceNode);
            } else if (NodeInspector.isAtomicRubyTextElement(children.item(i))) {
                RubyDOMRebuilder.flatten(children.item(i), containerNode);
            } else if (NodeInspector.isTextContainerDelimiter(children.item(i))) {
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
        //
        for (i = 0; i < children.length; i++) {
            // flatten phase
            if (NodeInspector.isAtomicRubyElement(children.item(i))) {
                RubyDOMRebuilder.flatten(children.item(i), rubyNode);
            } else if (NodeInspector.isContainerRubyElement(children.item(i))) {
                RubyPreprocessor.preprocessContainer(children.item(i), rubyNode);
            }
            // preprocess container elements
            if (NodeInspector.isNestedRubyElement(children.item(i))) {
                RubyPreprocessor.preprocess(children.item(i));
            } else if (NodeInspector.isContainerRubyElement(children.item(i))) {
                RubyPreprocessor.preprocessContainer(children.item(i));
            }

            // rebuild phase
            if (NodeInspector.isTextNode(children.item(i))) {
                // implicit rb node
                newNode = RubyDOMRebuilder.wrapChildWithNewElement(children.item(i), "rb");
                rubyNode.insertBefore(newNode, children.item(i));
            } else if (NodeInspector.isEmptyBaseNodeThenTextNode(children.item(i))) {
                newNode = RubyDOMRebuilder.wrapChildWithNewElement(RubyDOMRebuilder.nextNonWhitespaceSibling(children.item(i)), "rb");
//                while () {
                    // TODO keep adding nodes until you hit a bad end tag, or a whitelisted element type. Types include
                    // span, a, link,
//                }
                rubyNode.replaceChild(newNode, children.item(i)); //write over current rb node
            } else if (NodeInspector.isEmptyTextContainerNode(children.item(i))) {
                // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
                newNode = RubyDOMRebuilder.buildNewTextContainerNode(children.item(i));
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (NodeInspector.isEmptyBaseContainerNode(children.item(i))) {
                // empty rtc node, could be legitimately empty, or could be followed by rt nodes.
                newNode = RubyDOMRebuilder.buildNewBaseContainerNode(rubyNode, children.item(i));
                rubyNode.replaceChild(newNode, children.item(i));
            } else if (NodeInspector.isBadIE8ClosingTagNode(children.item(i))) {
                rubyNode.removeChild(children.item(i));
                i--;
            }
        }
        return rubyNode;
    };

    rubyChildren = document.getElementsByTagName("ruby");
    for (i = 0; i < rubyChildren.length; i++) {
        rubyNode = rubyChildren[i];
        rubyNode = RubyPreprocessor.preprocess(rubyNode);
    }

    for (i = 0; i < rubyChildren.length; i++) {
        rubyNode = rubyChildren[i];
        rubySegs = RubyDescriptorBuilder.getDescriptor(rubyNode);
        for (j = 0; j < rubySegs.length; j++) {
            SegmentProcessor.process(rubySegs[j]);
        }
        newRubyNode = SegmentProcessor.collapseIntoNode(rubySegs);
        rubyChildren[i].parentElement.replaceChild(newRubyNode, rubyChildren[i]);
        layout = new RubyLayoutManager(newRubyNode, rubySegs);
    }
    }()
);
