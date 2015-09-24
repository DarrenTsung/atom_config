var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require("atom-space-pen-views");
var EventKit = require('event-kit');
var TextView = (function (_super) {
    __extends(TextView, _super);
    function TextView(question, invokeNext) {
        _super.call(this);
        this.question = question;
        this.invokeNext = invokeNext;
    }
    TextView.content = function () {
        var _this = this;
        return this.div({}, function () {
            _this.p({
                outlet: 'message'
            }, '');
            return _this.subview('miniEditor', new spacePen.TextEditorView({
                mini: true
            }));
        });
    };
    TextView.prototype.initialize = function () {
        this.addClass('prompt');
    };
    TextView.prototype.toggle = function () {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        }
        else {
            this.show();
        }
    };
    TextView.prototype.show = function () {
        var _this = this;
        this.disposable = new EventKit.CompositeDisposable();
        this.disposable.add(atom.commands.add(document.body, 'core:confirm', function () { return _this.confirmed(); }));
        this.disposable.add(atom.commands.add(document.body, 'core:cancel', function () { return _this.cancel(); }));
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.message.text(this.question.message);
        this.panel.show();
        this.miniEditor.setText(this.question.default || "");
        this.miniEditor.focus();
        var textEditor = this.miniEditor.getModel();
        textEditor.selectAll();
    };
    TextView.prototype.hide = function () {
        this.panel && this.panel.hide();
        this.panel.destroy();
        this.panel = null;
    };
    TextView.prototype.cancel = function () {
        var filterEditorViewFocused = this.miniEditor.hasFocus();
        this.miniEditor.setText('');
        this.hide();
        this.disposable.dispose();
    };
    TextView.prototype.confirmed = function () {
        if (this.invokeNext) {
            this.invokeNext(this.miniEditor.getText());
        }
        this.cancel();
        return null;
    };
    return TextView;
})(spacePen.View);
exports.TextView = TextView;
var ConfirmView = (function (_super) {
    __extends(ConfirmView, _super);
    function ConfirmView() {
        _super.apply(this, arguments);
    }
    ConfirmView.prototype.show = function () {
        var _this = this;
        this.disposable = new EventKit.CompositeDisposable();
        this.disposable.add(atom.commands.add(document.body, 'core:confirm', function () { return _this.confirmed(); }));
        this.disposable.add(atom.commands.add(document.body, 'core:cancel', function () { return _this.cancel(); }));
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.message.text(this.question.message + ' ' + this.yesNo());
        this.panel.show();
        this.miniEditor.setText(this.question.default ? 'Y' : 'N');
        this.miniEditor.focus();
        var textEditor = this.miniEditor.getModel();
        textEditor.selectAll();
    };
    ConfirmView.prototype.yesNo = function () {
        var question = this.question;
        if (question.default === true) {
            return '(Y/n)';
        }
        else {
            return '(y/N)';
        }
    };
    return ConfirmView;
})(TextView);
exports.ConfirmView = ConfirmView;
