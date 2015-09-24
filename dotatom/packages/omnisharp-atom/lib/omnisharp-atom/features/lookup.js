// Inspiration : https://atom.io/packages/ide-haskell
// and https://atom.io/packages/ide-flow
// https://atom.io/packages/atom-typescript
var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var TooltipView = require('../views/tooltip-view');
var $ = require('jquery');
var escape = require("escape-html");
var TypeLookup = (function () {
    function TypeLookup() {
        this.required = false;
        this.title = 'Tooltip Lookup';
        this.description = 'Adds hover tooltips to the editor, also has a keybind';
    }
    TypeLookup.prototype.activate = function () {
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.switchActiveEditor(function (editor, cd) {
            // subscribe for tooltips
            // inspiration : https://github.com/chaika2013/ide-haskell
            var editorView = $(atom.views.getView(editor));
            var tooltip = editor['__omniTooltip'] = new Tooltip(editorView, editor);
            cd.add(tooltip);
            cd.add(editor.onDidDestroy(function () {
                editor['__omniTooltip'] = null;
                cd.dispose();
            }));
        }));
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:type-lookup", function () {
            Omni.activeEditor.first().subscribe(function (editor) {
                var tooltip = editor['__omniTooltip'];
                tooltip.showExpressionTypeOnCommand();
            });
        }));
    };
    TypeLookup.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return TypeLookup;
})();
var Tooltip = (function () {
    function Tooltip(editorView, editor) {
        var _this = this;
        this.editorView = editorView;
        this.editor = editor;
        this.exprTypeTimeout = null;
        this.exprTypeTooltip = null;
        this.rawView = editorView[0];
        var cd = this.disposable = new rx_1.CompositeDisposable();
        var scroll = this.getFromShadowDom(editorView, '.scroll-view');
        if (!scroll[0])
            return;
        // to debounce mousemove event's firing for some reason on some machines
        var lastExprTypeBufferPt;
        var mousemove = rx_1.Observable.fromEvent(scroll[0], 'mousemove');
        var mouseout = rx_1.Observable.fromEvent(scroll[0], 'mouseout');
        this.keydown = rx_1.Observable.fromEvent(scroll[0], 'keydown');
        cd.add(mousemove.map(function (event) {
            var pixelPt = _this.pixelPositionFromMouseEvent(editorView, event);
            var screenPt = editor.screenPositionForPixelPosition(pixelPt);
            var bufferPt = editor.bufferPositionForScreenPosition(screenPt);
            if (lastExprTypeBufferPt && lastExprTypeBufferPt.isEqual(bufferPt) && _this.exprTypeTooltip)
                return null;
            lastExprTypeBufferPt = bufferPt;
            return { bufferPt: bufferPt, event: event };
        })
            .where(function (z) { return !!z; })
            .tapOnNext(function () { return _this.hideExpressionType(); })
            .debounce(200)
            .where(function (x) { return _this.checkPosition(x.bufferPt); })
            .tapOnNext(function () { return _this.subcribeKeyDown(); })
            .subscribe(function (_a) {
            var bufferPt = _a.bufferPt, event = _a.event;
            _this.showExpressionTypeOnMouseOver(event, bufferPt);
        }));
        cd.add(mouseout.subscribe(function (e) { return _this.hideExpressionType(); }));
        cd.add(Omni.switchActiveEditor(function (editor, cd) {
            cd.add(rx_1.Disposable.create(function () { return _this.hideExpressionType(); }));
        }));
        cd.add(rx_1.Disposable.create(function () {
            _this.hideExpressionType();
        }));
    }
    Tooltip.prototype.subcribeKeyDown = function () {
        var _this = this;
        this.keydownSubscription = this.keydown.subscribe(function (e) { return _this.hideExpressionType(); });
        this.disposable.add(this.keydownSubscription);
    };
    Tooltip.prototype.showExpressionTypeOnCommand = function () {
        if (this.editor.cursors.length < 1)
            return;
        var buffer = this.editor.getBuffer();
        var bufferPt = this.editor.getCursorBufferPosition();
        if (!this.checkPosition(bufferPt))
            return;
        // find out show position
        var offset = (this.rawView.component.getFontSize() * bufferPt.column) * 0.7;
        var rect = this.getFromShadowDom(this.editorView, '.cursor-line')[0].getBoundingClientRect();
        var tooltipRect = {
            left: rect.left - offset,
            right: rect.left + offset,
            top: rect.bottom,
            bottom: rect.bottom
        };
        this.hideExpressionType();
        this.subcribeKeyDown();
        this.showToolTip(bufferPt, tooltipRect);
    };
    Tooltip.prototype.showExpressionTypeOnMouseOver = function (e, bufferPt) {
        if (!Omni.isOn) {
            return;
        }
        // If we are already showing we should wait for that to clear
        if (this.exprTypeTooltip)
            return;
        // find out show position
        var offset = this.editor.getLineHeightInPixels() * 0.7;
        var tooltipRect = {
            left: e.clientX,
            right: e.clientX,
            top: e.clientY - offset,
            bottom: e.clientY + offset
        };
        this.showToolTip(bufferPt, tooltipRect);
    };
    Tooltip.prototype.checkPosition = function (bufferPt) {
        var curCharPixelPt = this.rawView.pixelPositionForBufferPosition([bufferPt.row, bufferPt.column]);
        var nextCharPixelPt = this.rawView.pixelPositionForBufferPosition([bufferPt.row, bufferPt.column + 1]);
        if (curCharPixelPt.left >= nextCharPixelPt.left) {
            return false;
        }
        else {
            return true;
        }
        ;
    };
    Tooltip.prototype.showToolTip = function (bufferPt, tooltipRect) {
        var _this = this;
        this.exprTypeTooltip = new TooltipView(tooltipRect);
        var buffer = this.editor.getBuffer();
        // Actually make the program manager query
        Omni.request(function (client) { return client.typelookup({
            IncludeDocumentation: true,
            Line: bufferPt.row,
            Column: bufferPt.column
        }); }).subscribe(function (response) {
            if (response.Type === null) {
                return;
            }
            var message = "<b>" + escape(response.Type) + "</b>";
            if (response.Documentation) {
                message = message + ("<br/><i>" + escape(response.Documentation) + "</i>");
            }
            // Sorry about this "if". It's in the code I copied so I guess its there for a reason
            if (_this.exprTypeTooltip) {
                _this.exprTypeTooltip.updateText(message);
            }
        });
    };
    Tooltip.prototype.dispose = function () {
        this.disposable.dispose();
    };
    Tooltip.prototype.hideExpressionType = function () {
        if (!this.exprTypeTooltip)
            return;
        this.exprTypeTooltip.remove();
        this.exprTypeTooltip = null;
        if (this.keydownSubscription) {
            this.disposable.remove(this.keydownSubscription);
            this.keydownSubscription.dispose();
            this.keydownSubscription = null;
        }
    };
    Tooltip.prototype.getFromShadowDom = function (element, selector) {
        var el = element[0];
        var found = el.rootElement.querySelectorAll(selector);
        return $(found[0]);
    };
    Tooltip.prototype.pixelPositionFromMouseEvent = function (editorView, event) {
        var clientX = event.clientX, clientY = event.clientY;
        var linesClientRect = this.getFromShadowDom(editorView, '.lines')[0].getBoundingClientRect();
        var top = clientY - linesClientRect.top;
        var left = clientX - linesClientRect.left;
        top += this.editor.displayBuffer.getScrollTop();
        left += this.editor.displayBuffer.getScrollLeft();
        return { top: top, left: left };
    };
    Tooltip.prototype.screenPositionFromMouseEvent = function (editorView, event) {
        return editorView.getModel().screenPositionForPixelPosition(this.pixelPositionFromMouseEvent(editorView, event));
    };
    return Tooltip;
})();
exports.typeLookup = new TypeLookup;
