#html5ruby-shim

This library lets your page display a `<ruby>` element properly without support via a browser plugin.

Works in:

* browsers that do not normally support the ruby tag (like Firefox and Opera)
* browsers with buggy handling of ruby elements (like IE8 and Safari 5)

"html5ruby-shim" aims to provide full support for the HTML5 standard of the `<ruby>` element in older browsers.

## Usage

Just html5ruby-shim.js load in your HTML code.

## Description

The HTML5 `<ruby>` element does not exactly enjoy wide, comprehensive support in modern browsers, despite the element itself being defined for nearly a decade.

Firefox and Opera do not support it at all, while IE11 and Chrome only provide styling for very basic ruby.

## Features

Assuming correct ruby markup (according to the HTML5 standard), this library will **replace** each `<ruby>` element with a semantically corrected one. Cases handled include:

- Interleaved `<rb>` and `<rt>`
- end tag ommission for `<rb>`, `<rt>`, `<rp>`, and `<rtc>` elements.

To put it more simply, if you want a 1 above A, 2 above B, and a 3 above C, you can now do this:

`<ruby><rb>A<rb>B<rb>C<rt>1<rt>2<rt>3</ruby>`

or even this:

`<ruby><rb>A<rt>1<rb>B<rt>2<rb>C<rt>3</ruby>`

... instead of this
`<ruby><rb>A</rb><rb>B</rb><rb>C</rb><rt>1</rt><rt>2</rt><rt>3</rt></ruby>`

And you will still end up with a correct DOM and an element that displays properly.

## Known Issues

* Text outside of the ruby element not aligning vertically with ruby bases. 
* Currently annotations spanning multiple elements is not working
* `span` elements within `rb` elements not working in IE8
* Text directly inside `rtc` nodes treated as `rb` nodes rather than `rt` nodes in Safari 5 and IE8
This library currently does not deal with `<span>` elements within `<rb>` elements in IE8.