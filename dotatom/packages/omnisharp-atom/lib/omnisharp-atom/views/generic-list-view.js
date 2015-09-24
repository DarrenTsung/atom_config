var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require("atom-space-pen-views");
var _ = require('lodash');
var rx_1 = require("rx");
var GenericSelectListView = (function (_super) {
    __extends(GenericSelectListView, _super);
    function GenericSelectListView(messageText, _items, onConfirm, onCancel) {
        _super.call(this);
        this.messageText = messageText;
        this._items = _items;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this._onClosed = new rx_1.AsyncSubject();
        this.keyBindings = null;
    }
    Object.defineProperty(GenericSelectListView.prototype, "onClosed", {
        get: function () { return this._onClosed; },
        enumerable: true,
        configurable: true
    });
    ;
    GenericSelectListView.content = function () {
        var _this = this;
        return this.div({}, function () {
            _this.p({
                outlet: 'message'
            }, '');
            spacePen.SelectListView.content.call(_this);
        });
    };
    GenericSelectListView.prototype.initialize = function () {
        spacePen.SelectListView.prototype.initialize.call(this);
        this.addClass('generic-list');
        this.message.text(this.messageText);
        return false;
    };
    GenericSelectListView.prototype.getFilterKey = function () {
        return 'displayName';
    };
    GenericSelectListView.prototype.cancelled = function () {
        this.onCancel();
        return this.hide();
    };
    GenericSelectListView.prototype.toggle = function () {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        }
        else {
            this.show();
        }
    };
    GenericSelectListView.prototype.show = function () {
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.panel.show();
        this.storeFocusedElement();
        if (this.previouslyFocusedElement[0] && this.previouslyFocusedElement[0] !== document.body) {
            this.eventElement = this.previouslyFocusedElement[0];
        }
        else {
            this.eventElement = atom.views.getView(atom.workspace);
        }
        this.keyBindings = atom.keymaps.findKeyBindings({
            target: this.eventElement
        });
        // infer the generator somehow? based on the project information?  store in the project system??
        var commands = _.sortBy(this._items, 'displayName');
        this.setItems(commands);
        this.focusFilterEditor();
    };
    GenericSelectListView.prototype.hide = function () {
        this._onClosed.onNext(true);
        this._onClosed.onCompleted();
        this.panel && this.panel.hide();
        this.panel.destroy();
        this.panel = null;
    };
    GenericSelectListView.prototype.viewForItem = function (item) {
        var keyBindings = this.keyBindings;
        return spacePen.$$(function () {
            var _this = this;
            return this.li({
                "class": 'event',
                'data-event-name': item.name
            }, function () {
                return _this.span(item.displayName, {
                    title: item.name
                });
            });
        });
    };
    GenericSelectListView.prototype.confirmed = function (item) {
        this.onConfirm(item.name);
        this.cancel();
        return null;
    };
    return GenericSelectListView;
})(spacePen.SelectListView);
exports.GenericSelectListView = GenericSelectListView;
