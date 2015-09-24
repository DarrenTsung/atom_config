var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require('atom-space-pen-views');
var $ = spacePen.jQuery;
var TooltipView = (function (_super) {
    __extends(TooltipView, _super);
    function TooltipView(rect) {
        _super.call(this);
        this.rect = rect;
        $(document.body).append(this[0]);
        this.updatePosition();
    }
    TooltipView.content = function () {
        var _this = this;
        return this.div({ class: 'atom-typescript-tooltip tooltip' }, function () {
            _this.div({ class: 'tooltip-inner', outlet: 'inner' });
        });
    };
    TooltipView.prototype.updateText = function (text) {
        this.inner.html(text);
        this.inner.css({ 'white-space': 'pre', 'text-align': 'left' });
        this.updatePosition();
        this.fadeTo(300, 1);
    };
    TooltipView.prototype.updatePosition = function () {
        var offset = 10;
        var left = this.rect.right;
        var top = this.rect.bottom;
        var right = undefined;
        // X axis adjust
        if (left + this[0].offsetWidth >= $(document.body).width())
            left = $(document.body).width() - this[0].offsetWidth - offset;
        if (left < 0) {
            this.css({ 'white-space': 'pre-wrap' });
            left = offset;
            right = offset;
        }
        // Y axis adjust
        if (top + this[0].offsetHeight >= $(document.body).height()) {
            top = this.rect.top - this[0].offsetHeight;
        }
        this.css({ left: left, top: top, right: right });
    };
    return TooltipView;
})(spacePen.View);
module.exports = TooltipView;
