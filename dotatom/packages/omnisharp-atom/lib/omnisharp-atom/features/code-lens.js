var _ = require('lodash');
var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var fastdom_1 = require("fastdom");
var CodeLens = (function () {
    function CodeLens() {
        this.decorations = new WeakMap();
        this.required = false;
        this.title = 'Code Lens';
        this.description = 'Adds support for displaying references in the editor.';
    }
    CodeLens.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.eachEditor(function (editor, cd) {
            cd.add(rx_1.Disposable.create(function () {
                var markers = _this.decorations.get(editor);
                if (markers) {
                    markers.forEach(function (marker) { return marker.dispose(); });
                }
                _this.decorations.delete(editor);
            }));
            cd.add(atom.config.observe('editor.fontSize', function (size) {
                var decorations = _this.decorations.get(editor);
                var lineHeight = editor.getLineHeightInPixels();
                if (decorations && lineHeight) {
                    decorations.forEach(function (decoration) { return decoration.updateTop(lineHeight); });
                }
            }));
        }));
        this.disposable.add(Omni.switchActiveEditor(function (editor, cd) {
            var items = _this.decorations.get(editor);
            if (!items)
                _this.decorations.set(editor, new Set());
            var subject = new rx_1.Subject();
            cd.add(subject
                .distinctUntilChanged(function (x) { return !!x; })
                .where(function (x) { return !!x && !editor.isDestroyed(); })
                .debounce(500)
                .flatMapLatest(function () { return _this.updateCodeLens(editor); })
                .subscribe());
            var bindDidChange = function () {
                var didChange = editor.getBuffer().onDidChange(function () {
                    didChange.dispose();
                    cd.remove(didChange);
                    subject.onNext(false);
                });
                cd.add(didChange);
            };
            cd.add(editor.getBuffer().onDidStopChanging(_.debounce(function () {
                !subject.isDisposed && subject.onNext(true);
                bindDidChange();
            }, 5000)));
            cd.add(editor.getBuffer().onDidSave(function () { return !subject.isDisposed && subject.onNext(true); }));
            cd.add(editor.getBuffer().onDidReload(function () { return !subject.isDisposed && subject.onNext(true); }));
            cd.add(Omni.whenEditorConnected(editor).subscribe(function () { return subject.onNext(true); }));
            cd.add(editor.onDidChangeScrollTop(function () { return _this.updateDecoratorVisiblility(editor); }));
            cd.add(atom.commands.onWillDispatch(function (event) {
                if (_.contains(["omnisharp-atom:toggle-dock", "omnisharp-atom:show-dock", "omnisharp-atom:hide-dock"], event.type)) {
                    _this.updateDecoratorVisiblility(editor);
                }
            }));
            cd.add(subject);
            _this.updateDecoratorVisiblility(editor);
        }));
    };
    CodeLens.prototype.updateDecoratorVisiblility = function (editor) {
        var decorations = this.decorations.get(editor);
        decorations.forEach(function (decoration) { return decoration.updateVisible(); });
    };
    CodeLens.prototype.dispose = function () {
        this.disposable.dispose();
    };
    CodeLens.prototype.updateCodeLens = function (editor) {
        if (!this.decorations.has(editor))
            this.decorations.set(editor, new Set());
        var decorations = this.decorations.get(editor);
        var lineHeight = editor.getLineHeightInPixels();
        var updated = new WeakSet();
        if (editor.isDestroyed()) {
            return;
        }
        return Omni.request(editor, function (solution) { return solution.currentfilemembersasflat({ Buffer: null, Changes: null }); })
            .observeOn(rx_1.Scheduler.timeout)
            .where(function (fileMembers) { return !!fileMembers; })
            .flatMap(function (fileMembers) { return rx_1.Observable.from(fileMembers); })
            .flatMap(function (fileMember) {
            var range = editor.getBuffer().rangeForRow(fileMember.Line, false);
            var marker = editor.markBufferRange(range, { invalidate: 'inside' });
            var iteratee = decorations.values();
            var decoration = iteratee.next();
            while (!decoration.done) {
                if (decoration.value.isEqual(marker)) {
                    var lens = decoration.value;
                    break;
                }
                decoration = iteratee.next();
            }
            if (lens) {
                updated.add(lens);
                lens.invalidate();
            }
            else {
                lens = new Lens(editor, fileMember, marker, range, rx_1.Disposable.create(function () {
                    decorations.delete(lens);
                }));
                updated.add(lens);
                decorations.add(lens);
            }
            return lens.updateVisible();
        })
            .tapOnCompleted(function () {
            // Remove all old/missing decorations
            decorations.forEach(function (lens) {
                if (lens && !updated.has(lens)) {
                    lens.dispose();
                }
            });
        });
    };
    return CodeLens;
})();
function isLineVisible(editor, line) {
    var element = atom.views.getView(editor);
    var top = element.getFirstVisibleScreenRow();
    var bottom = element.getLastVisibleScreenRow();
    if (line <= top || line >= bottom)
        return false;
    return true;
}
var Lens = (function () {
    function Lens(_editor, _member, _marker, _range, disposer) {
        var _this = this;
        this._editor = _editor;
        this._member = _member;
        this._marker = _marker;
        this._range = _range;
        this._disposable = new rx_1.CompositeDisposable();
        this.loaded = false;
        this._issueUpdate = _.debounce(function (isVisible) {
            !_this._update.isDisposed && _this._update.onNext(isVisible);
        }, 250);
        this._row = _range.getRows()[0];
        this._update = new rx_1.Subject();
        this._disposable.add(this._update);
        this._path = _editor.getPath();
        this._updateObservable = this._update
            .observeOn(rx_1.Scheduler.timeout)
            .where(function (x) { return !!x; })
            .flatMap(function () { return Omni.request(_this._editor, function (solution) {
            return solution.findusages({ FileName: _this._path, Column: _this._member.Column + 1, Line: _this._member.Line, Buffer: null, Changes: null }, { silent: true });
        }); })
            .where(function (x) { return x && x.QuickFixes && !!x.QuickFixes.length; })
            .map(function (x) { return x && x.QuickFixes && x.QuickFixes.length - 1; })
            .share();
        this._disposable.add(this._updateObservable
            .take(1)
            .where(function (x) { return x > 0; })
            .tapOnNext(function () { return _this.loaded = true; })
            .subscribe(function (x) { return _this._decorate(x); }));
        this._disposable.add(disposer);
        this._disposable.add(this._marker.onDidDestroy(function () {
            _this.dispose();
        }));
    }
    Lens.prototype.updateVisible = function () {
        var isVisible = this._isVisible();
        this._updateDecoration(isVisible);
        if (isVisible) {
            var result = this._updateObservable.take(1);
        }
        else {
            var result = rx_1.Observable.empty();
        }
        this._issueUpdate(isVisible);
        return result;
    };
    Lens.prototype.updateTop = function (lineHeight) {
        if (this._element)
            this._element.style.top = "-" + lineHeight + "px";
    };
    Lens.prototype.invalidate = function () {
        var _this = this;
        this._updateObservable
            .take(1)
            .subscribe(function (x) {
            if (x <= 0) {
                _this.dispose();
            }
            else {
                _this._element && (_this._element.textContent = x.toString());
            }
        });
    };
    Lens.prototype.isEqual = function (marker) {
        return this._marker.isEqual(marker);
    };
    Lens.prototype._isVisible = function () {
        return isLineVisible(this._editor, this._row);
    };
    Lens.prototype._updateDecoration = function (isVisible) {
        if (this._decoration && this._element) {
            var element = this._element;
            if (isVisible) {
                fastdom_1.read(function () { return element.style.display === 'none' && fastdom_1.write(function () { return element.style.display = ''; }); });
            }
            else {
                fastdom_1.read(function () { return element.style.display !== 'none' && fastdom_1.write(function () { return element.style.display = 'none'; }); });
            }
        }
    };
    Lens.prototype._decorate = function (count) {
        var _this = this;
        var lineHeight = this._editor.getLineHeightInPixels();
        var element = this._element = document.createElement('div');
        element.style.position = 'relative';
        element.style.top = "-" + lineHeight + "px";
        element.style.left = '16px';
        element.classList.add('highlight-info', 'badge', 'badge-small');
        element.textContent = count.toString();
        element.onclick = function () { return Omni.request(_this._editor, function (s) { return s.findusages({ FileName: _this._path, Column: _this._member.Column + 1, Line: _this._member.Line, Buffer: null, Changes: null }); }); };
        this._decoration = this._editor.decorateMarker(this._marker, { type: "overlay", class: "codelens", item: this._element, position: 'head' });
        this._disposable.add(rx_1.Disposable.create(function () {
            _this._element.remove();
            _this._decoration.destroy();
            _this._element = null;
        }));
        var isVisible = isLineVisible(this._editor, this._row);
        if (!isVisible) {
            element.style.display = 'none';
        }
        return this._decoration;
    };
    Lens.prototype.dispose = function () { return this._disposable.dispose(); };
    return Lens;
})();
exports.Lens = Lens;
exports.codeLens = new CodeLens();
