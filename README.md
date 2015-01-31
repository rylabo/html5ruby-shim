#html5ruby-shim

If you want out-of-the-box support in browsers that do not normally support the ruby tag (like Firefox and Opera), or support for browser with buggy handling of ruby elements (like IE8 and Safari 5), then this library is for you! 

This library aims to provide support for the HTML5 standard for ruby element in older browsers.

## Usage
### If you only want a corrected DOM

Just have the html5ruby-shim.js load in your HTML code

### If you want a default syle applied

## Description

The HTML5 '<ruby>' element does not exactly enjoy wide, comprehensive support in modern browsers, besides the element itself being defined for nearly a decade.

Firefox and Opera do not 

## Features

Assuming correct ruby markup (according to the HTML5 standard), this library will each '<ruby>' element with a semantically corrected one. Cases handled include:

- Interleaved &lt;rb&gt; and &lt;rt&gt;
- end tag ommission for &lt;rb&gt;, &lt;rt&gt;, &lt;rp&gt;, and &lt;rtc&gt; elements.

To put it more simply, it means you can do this:

`<ruby><rb>A<rb>B<rb>C<rt>1<rt>2<rt>3</ruby>`

or even this:

`<ruby><rb>A<rt>1<rb>B<rt>2<rb>C<rt>3</ruby>`

... instead of this
`<ruby><rb>A</rb><rb>B</rb><rb>C</rb><rt>1</rt><rt>2</rt><rt>3</rt></ruby>`

And you will still end up with a correct DOM!

## Known Issues

This library currently does not deal with `<span>` elements within `<rb>` elements in IE8.