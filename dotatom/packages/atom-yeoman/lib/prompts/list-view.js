var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require("atom-space-pen-views");
var ListView = (function (_super) {
    __extends(ListView, _super);
    function ListView(question, invokeNext) {
        _super.call(this);
        this.question = question;
        this.invokeNext = invokeNext;
    }
    ListView.content = function () {
        var _this = this;
        return this.div({}, function () {
            _this.p({
                outlet: 'message'
            }, '');
            // TS 1.4 issue
            spacePen.SelectListView.content.call(_this);
        });
    };
    ListView.prototype.initialize = function () {
        // TS 1.4 issue
        spacePen.SelectListView.prototype.initialize.call(this);
        this.addClass('prompt');
    };
    ListView.prototype.getFilterKey = function () {
        return 'name';
    };
    ListView.prototype.cancelled = function () {
        return this.hide();
    };
    ListView.prototype.toggle = function () {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        }
        else {
            this.show();
        }
    };
    ListView.prototype.show = function () {
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.panel.show();
        this.storeFocusedElement();
        this.message.text(this.question.message);
        if (this.previouslyFocusedElement[0] && this.previouslyFocusedElement[0] !== document.body) {
            this.eventElement = this.previouslyFocusedElement[0];
        }
        else {
            this.eventElement = atom.views.getView(atom.workspace);
        }
        // infer the generator somehow? based on the project information?  store in the project system??
        this.setItems(this.question.choices);
        this.focusFilterEditor();
        if (this.question.default) {
            var selected = this.list.find('[data-event-name="' + this.question.default + '"]');
            this.selectItemView(selected);
        }
    };
    ListView.prototype.hide = function () {
        this.panel && this.panel.hide();
        this.panel.destroy();
        this.panel = null;
    };
    ListView.prototype.viewForItem = function (item) {
        return spacePen.$$(function () {
            var _this = this;
            return this.li({
                "class": 'event',
                'data-event-name': item.value
            }, function () {
                return _this.span(item.name, {
                    title: item.name
                });
            });
        });
    };
    ListView.prototype.confirmed = function (item) {
        this.cancel();
        if (this.invokeNext) {
            this.invokeNext(item.value);
        }
        return null;
    };
    return ListView;
})(spacePen.SelectListView);
module.exports = ListView;
