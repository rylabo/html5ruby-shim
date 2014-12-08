(function () { "use strict";
    function testRuby() {
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
    var val = testRuby();
    }()
);
