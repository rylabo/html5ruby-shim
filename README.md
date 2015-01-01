#html5ruby-shim

This library aims to provide support for the HTML5 ruby element in older browsers.

Designed to Support:

- IE8+
- Safari 5+
- Chrome
- Firefox
- Opera

##Features

Assuming correct ruby markup, this produces a semantically correct DOM. Cases handled include

- Interleaved &lt;rb&gt; and &lt;rt&gt;
- end tag ommission for &lt;rb&gt;, &lt;rt&gt;, &lt;rp&gt;, and &lt;rtc&gt; elements.
