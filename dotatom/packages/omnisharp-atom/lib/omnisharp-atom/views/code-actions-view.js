var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SpacePen = require('atom-space-pen-views');
function default_1(options, editor) {
    var codeActionView = editor.codeActionView;
    if (!codeActionView) {
        editor.codeActionView = codeActionView = new CodeActionsView(options, editor);
    }
    else {
        codeActionView.options = options;
    }
    codeActionView.setItems();
    codeActionView.show();
    return codeActionView;
}
exports.__esModule = true;
exports["default"] = default_1;
var CodeActionsView = (function (_super) {
    __extends(CodeActionsView, _super);
    function CodeActionsView(options, editor) {
        _super.call(this);
        this.options = options;
        this.editor = editor;
        this._editorElement = atom.views.getView(editor);
        this._vimMode = atom.packages.isPackageActive("vim-mode");
        this.$.addClass('code-actions-overlay');
        this.filterEditorView.model.placeholderText = 'Filter list';
    }
    Object.defineProperty(CodeActionsView.prototype, "$", {
        get: function () {
            return this;
        },
        enumerable: true,
        configurable: true
    });
    CodeActionsView.prototype.setItems = function () {
        //super.setItems(this.options.items)
        SpacePen.SelectListView.prototype.setItems.call(this, this.options.items);
    };
    CodeActionsView.prototype.confirmed = function (item) {
        this.cancel(); //will close the view
        this.options.confirmed(item);
        this.enableVimMode();
        return null;
    };
    CodeActionsView.prototype.show = function () {
        var _this = this;
        this.storeFocusedElement();
        this.disableVimMode();
        this.destroyOverlay();
        this._overlayDecoration = this.editor.decorateMarker(this.editor.getLastCursor().getMarker(), { type: "overlay", position: "tail", item: this });
        setTimeout(function () { return _this.focusFilterEditor(); }, 100);
    };
    CodeActionsView.prototype.hide = function () {
        this.restoreFocus();
        this.enableVimMode();
        this.destroyOverlay();
    };
    CodeActionsView.prototype.destroyOverlay = function () {
        if (this._overlayDecoration)
            this._overlayDecoration.destroy();
    };
    CodeActionsView.prototype.cancelled = function () {
        this.hide();
    };
    CodeActionsView.prototype.enableVimMode = function () {
        if (this._vimMode) {
            this._editorElement.classList.add("vim-mode");
        }
    };
    CodeActionsView.prototype.disableVimMode = function () {
        if (this._vimMode) {
            this._editorElement.classList.remove("vim-mode");
        }
    };
    CodeActionsView.prototype.getFilterKey = function () { return 'Name'; };
    CodeActionsView.prototype.viewForItem = function (item) {
        return SpacePen.$$(function () {
            var _this = this;
            return this.li({
                "class": 'event',
                'data-event-name': item.Name
            }, function () {
                return _this.span(item.Name, {
                    title: item.Name
                });
            });
        });
    };
    return CodeActionsView;
})(SpacePen.SelectListView);
