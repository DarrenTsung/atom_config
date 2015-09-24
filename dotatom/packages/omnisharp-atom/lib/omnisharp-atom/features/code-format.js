var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var Changes = require('../services/apply-changes');
var CodeFormat = (function () {
    function CodeFormat() {
        this.required = true;
        this.title = 'Code Format';
        this.description = 'Support for code formatting.';
    }
    CodeFormat.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format', function () { return _this.format(); }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format-on-semicolon', function (event) { return _this.formatOnKeystroke(event, ';'); }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format-on-curly-brace', function (event) { return _this.formatOnKeystroke(event, '}'); }));
    };
    CodeFormat.prototype.dispose = function () {
        this.disposable.dispose();
    };
    CodeFormat.prototype.format = function () {
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            var buffer = editor.getBuffer();
            Omni.request(editor, function (client) {
                var request = {
                    Line: 0,
                    Column: 0,
                    EndLine: buffer.getLineCount() - 1,
                    EndColumn: 0
                };
                return client
                    .formatRangePromise(request)
                    .then(function (data) { return Changes.applyChanges(editor, data); });
            });
        }
    };
    CodeFormat.prototype.formatOnKeystroke = function (event, char) {
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            editor.insertText(char);
            Omni.request(editor, function (client) {
                var request = {
                    Character: char
                };
                return client.formatAfterKeystrokePromise(request)
                    .then(function (data) { return Changes.applyChanges(editor, data); });
            });
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return false;
    };
    return CodeFormat;
})();
exports.codeFormat = new CodeFormat;
