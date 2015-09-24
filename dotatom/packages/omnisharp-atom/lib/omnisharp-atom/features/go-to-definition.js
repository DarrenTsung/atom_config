var _ = require('lodash');
var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var $ = require('jquery');
var Range = require('atom').Range;
var identifierRegex = /^identifier|identifier$|\.identifier\./;
var GoToDefinition = (function () {
    function GoToDefinition() {
        this.exprTypeTimeout = null;
        this.marker = null;
        this.required = true;
        this.title = 'Go To Definition';
        this.description = 'Adds support to goto definition, as well as display metadata returned by a goto definition metadata response';
    }
    GoToDefinition.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.switchActiveEditor(function (editor, cd) {
            var view = $(atom.views.getView(editor));
            var scroll = _this.getFromShadowDom(view, '.scroll-view');
            if (!scroll[0]) {
                return;
            }
            var click = rx_1.Observable.fromEvent(scroll[0], 'click');
            var mousemove = rx_1.Observable.fromEvent(scroll[0], 'mousemove');
            var keyup = rx_1.Observable.merge(rx_1.Observable.fromEvent(view[0], 'focus'), rx_1.Observable.fromEvent(view[0], 'blur'), rx_1.Observable.fromEventPattern(function (x) { atom.getCurrentWindow().on('focus', x); }, function (x) { atom.getCurrentWindow().removeListener('focus', x); }), rx_1.Observable.fromEventPattern(function (x) { atom.getCurrentWindow().on('blur', x); }, function (x) { atom.getCurrentWindow().removeListener('blur', x); }), rx_1.Observable.fromEvent(view[0], 'keyup')
                .where(function (x) { return x.which === 17 || x.which === 224 || x.which === 93 || x.which === 91; }))
                .throttle(100);
            var keydown = rx_1.Observable.fromEvent(view[0], 'keydown')
                .where(function (z) { return !z.repeat; })
                .where(function (e) { return e.ctrlKey || e.metaKey; })
                .throttle(100);
            var specialKeyDown = keydown
                .flatMapLatest(function (x) { return mousemove
                .takeUntil(keyup)
                .map(function (event) {
                var pixelPt = _this.pixelPositionFromMouseEvent(editor, view, event);
                var screenPt = editor.screenPositionForPixelPosition(pixelPt);
                return editor.bufferPositionForScreenPosition(screenPt);
            })
                .startWith(editor.getCursorBufferPosition())
                .map(function (bufferPt) { return ({ bufferPt: bufferPt, range: _this.getWordRange(editor, bufferPt) }); })
                .where(function (z) { return !!z.range; })
                .distinctUntilChanged(function (x) { return x; }, function (current, next) { return current.range.isEqual(next.range); }); });
            editor.onDidDestroy(function () { return cd.dispose(); });
            var eventDisposable;
            cd.add(atom.config.observe('omnisharp-atom.enhancedHighlighting', function (enabled) {
                _this.enhancedHighlighting = enabled;
                if (eventDisposable) {
                    eventDisposable.dispose();
                    cd.remove(eventDisposable);
                }
                var observable = specialKeyDown;
                if (!enabled) {
                    observable = observable.debounce(200);
                }
                eventDisposable = observable
                    .subscribe(function (_a) {
                    var bufferPt = _a.bufferPt, range = _a.range;
                    return _this.underlineIfNavigable(editor, bufferPt, range);
                });
                cd.add(eventDisposable);
            }));
            cd.add(keyup.subscribe(function () { return _this.removeMarker(); }));
            cd.add(click.subscribe(function (e) {
                if (!e.ctrlKey && !e.metaKey) {
                    return;
                }
                _this.removeMarker();
                _this.goToDefinition();
            }));
            _this.disposable.add(cd);
        }));
        this.disposable.add(atom.emitter.on("symbols-view:go-to-declaration", function () { return _this.goToDefinition(); }));
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:go-to-definition", function () { return _this.goToDefinition(); }));
        this.disposable.add(atom.config.observe('omnisharp-atom.wantMetadata', function (enabled) {
            _this.wantMetadata = enabled;
        }));
    };
    GoToDefinition.prototype.dispose = function () {
        this.disposable.dispose();
    };
    GoToDefinition.prototype.goToDefinition = function () {
        var _this = this;
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            var word = editor.getWordUnderCursor();
            Omni.request(editor, function (client) { return client.gotodefinition({
                WantMetadata: _this.wantMetadata
            }); })
                .subscribe(function (data) {
                if (data.FileName != null) {
                    Omni.navigateTo(data);
                }
                else if (data.MetadataSource) {
                    var _a = data.MetadataSource, AssemblyName = _a.AssemblyName, TypeName = _a.TypeName;
                    atom.workspace.open("omnisharp://metadata/" + AssemblyName + "/" + TypeName, {
                        initialLine: data.Line,
                        initialColumn: data.Column,
                        searchAllPanes: true
                    });
                }
                else {
                    atom.notifications.addWarning("Can't navigate to '" + word + "'");
                }
            });
        }
    };
    GoToDefinition.prototype.clearExprTypeTimeout = function () {
        if (this.exprTypeTimeout) {
            clearTimeout(this.exprTypeTimeout);
            this.exprTypeTimeout = null;
        }
    };
    GoToDefinition.prototype.getWordRange = function (editor, bufferPt) {
        var buffer = editor.getBuffer();
        var startColumn = bufferPt.column;
        var endColumn = bufferPt.column;
        var line = buffer.getLines()[bufferPt.row];
        if (!/[A-Z_0-9]/i.test(line[bufferPt.column])) {
            if (this.marker)
                this.removeMarker();
            return;
        }
        while (startColumn > 0 && /[A-Z_0-9]/i.test(line[--startColumn])) {
        }
        while (endColumn < line.length && /[A-Z_0-9]/i.test(line[++endColumn])) {
        }
        return new Range([bufferPt.row, startColumn + 1], [bufferPt.row, endColumn]);
    };
    GoToDefinition.prototype.underlineIfNavigable = function (editor, bufferPt, wordRange) {
        var _this = this;
        if (this.marker &&
            this.marker.bufferMarker.range &&
            this.marker.bufferMarker.range.compare(wordRange) === 0)
            return;
        var addMark = function () {
            _this.removeMarker();
            _this.marker = editor.markBufferRange(wordRange);
            var decoration = editor.decorateMarker(_this.marker, { type: 'highlight', class: 'gotodefinition-underline' });
        };
        if (this.enhancedHighlighting) {
            var scopes = editor.scopeDescriptorForBufferPosition(bufferPt).scopes;
            if (identifierRegex.test(_.last(scopes))) {
                addMark();
            }
        }
        else {
            // If enhanced highlighting is off, fallback to the old method.
            Omni.request(editor, function (client) { return client.gotodefinition({
                Line: bufferPt.row,
                Column: bufferPt.column
            }); }).where(function (data) { return !!data.FileName || !!data['MetadataSource']; })
                .subscribe(function (data) { return addMark(); });
        }
    };
    GoToDefinition.prototype.pixelPositionFromMouseEvent = function (editor, editorView, event) {
        var clientX = event.clientX, clientY = event.clientY;
        var linesClientRect = this.getFromShadowDom(editorView, '.lines')[0].getBoundingClientRect();
        var top = clientY - linesClientRect.top;
        var left = clientX - linesClientRect.left;
        top += editor.displayBuffer.getScrollTop();
        left += editor.displayBuffer.getScrollLeft();
        return { top: top, left: left };
    };
    GoToDefinition.prototype.getFromShadowDom = function (element, selector) {
        var el = element[0];
        var found = el.rootElement.querySelectorAll(selector);
        return $(found[0]);
    };
    GoToDefinition.prototype.removeMarker = function () {
        if (this.marker !== null) {
            this.marker.destroy();
            this.marker = null;
        }
    };
    return GoToDefinition;
})();
exports.goToDefintion = new GoToDefinition;
