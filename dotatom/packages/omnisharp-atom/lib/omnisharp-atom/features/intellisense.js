var rx_1 = require("rx");
var lodash_1 = require("lodash");
var Omni = require('../../omni-sharp-server/omni');
var Intellisense = (function () {
    function Intellisense() {
        this.required = true;
        this.title = 'Intellisense';
        this.description = 'Augments some of the issues with Atoms autocomplete-plus package';
    }
    Intellisense.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:intellisense-dot', function (event) {
            _this.complete(event, '.');
            lodash_1.delay(function () { return atom.commands.dispatch(atom.views.getView(atom.workspace.getActiveTextEditor()), 'autocomplete-plus:activate'); }, 100);
        }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:intellisense-space', function (event) { return _this.complete(event, ' '); }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:intellisense-semicolon', function (event) { return _this.complete(event, ';'); }));
    };
    Intellisense.prototype.dispose = function () {
        this.disposable.dispose();
    };
    Intellisense.prototype.complete = function (event, char) {
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            var view = atom.views.getView(editor);
            atom.commands.dispatch(atom.views.getView(editor), 'autocomplete-plus:confirm');
            editor.insertText(char);
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();
            return false;
        }
    };
    return Intellisense;
})();
exports.intellisense = new Intellisense;
