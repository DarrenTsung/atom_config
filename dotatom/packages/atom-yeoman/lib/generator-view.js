var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require("atom-space-pen-views");
var _ = require('./lodash');
var GeneratorView = (function (_super) {
    __extends(GeneratorView, _super);
    function GeneratorView(_items, invokeNext) {
        _super.call(this);
        this._items = _items;
        this.invokeNext = invokeNext;
        this.keyBindings = null;
    }
    GeneratorView.content = function () {
        var _this = this;
        return this.div({}, function () {
            _this.p({
                outlet: 'message'
            }, '');
            // TS 1.4 issue
            spacePen.SelectListView.content.call(_this);
        });
    };
    GeneratorView.prototype.initialize = function () {
        // TS 1.4 issue
        spacePen.SelectListView.prototype.initialize.call(this);
        this.addClass('generator');
    };
    GeneratorView.prototype.getFilterKey = function () {
        return 'displayName';
    };
    GeneratorView.prototype.cancelled = function () {
        return this.hide();
    };
    GeneratorView.prototype.toggle = function () {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        }
        else {
            this.show();
        }
    };
    GeneratorView.prototype.show = function () {
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
    GeneratorView.prototype.hide = function () {
        this.panel && this.panel.hide();
        this.panel.destroy();
        this.panel = null;
    };
    GeneratorView.prototype.viewForItem = function (item) {
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
    GeneratorView.prototype.confirmed = function (item) {
        this.cancel();
        if (this.invokeNext) {
            this.invokeNext(item.name);
        }
        return null;
    };
    return GeneratorView;
})(spacePen.SelectListView);
module.exports = GeneratorView;
