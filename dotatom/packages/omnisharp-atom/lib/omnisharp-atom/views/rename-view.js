var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePenViews = require('atom-space-pen-views');
var $ = spacePenViews.jQuery;
var TextEditorView = spacePenViews.TextEditorView;
var Omni = require('../../omni-sharp-server/omni');
var RenameView = (function (_super) {
    __extends(RenameView, _super);
    function RenameView() {
        _super.apply(this, arguments);
        this.wordToRename = null;
    }
    RenameView.content = function () {
        var _this = this;
        return this.div({
            "class": 'rename overlay from-top'
        }, function () {
            _this.p({
                outlet: 'message',
                "class": 'icon icon-diff-renamed'
            }, 'Rename to:');
            return _this.subview('miniEditor', new spacePenViews.TextEditorView({
                mini: true
            }));
        });
    };
    RenameView.prototype.initialize = function () {
        var _this = this;
        atom.commands.add(this[0], 'core:confirm', function () { return _this.rename(); });
        atom.commands.add(this[0], 'core:cancel', function () { return _this.destroy(); });
    };
    RenameView.prototype.configure = function (wordToRename) {
        this.miniEditor.setText(wordToRename);
        return this.miniEditor.focus();
    };
    RenameView.prototype.rename = function () {
        var _this = this;
        Omni.request(function (client) { return client.rename({
            RenameTo: _this.miniEditor.getText(),
            WantsTextChanges: true
        }); });
        return this.destroy();
    };
    RenameView.prototype.destroy = function () {
        this.miniEditor.setText('');
        return this.detach();
    };
    return RenameView;
})(spacePenViews.View);
module.exports = RenameView;
