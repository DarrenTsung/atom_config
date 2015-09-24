var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var spacePen = require("atom-space-pen-views");
var _ = require('../lodash');
var $ = require('jquery');
var EventKit = require("event-kit");
var CheckboxView = (function (_super) {
    __extends(CheckboxView, _super);
    function CheckboxView(question, invokeNext) {
        _super.call(this);
        this.question = question;
        this.invokeNext = invokeNext;
        this.maxItems = Infinity;
        this.scheduleTimeout = null;
        this.inputThrottle = 50;
        this.cancelling = false;
    }
    CheckboxView.content = function () {
        var _this = this;
        return this.div({}, function () {
            _this.p({
                outlet: 'message'
            }, '');
            return _this.div({
                "class": 'select-list'
            }, (function () {
                _this.div({
                    "class": 'error-message',
                    outlet: 'errors'
                });
                _this.div({
                    "class": 'loading',
                    outlet: 'loadingArea'
                }, function () {
                    _this.span({
                        "class": 'loading-message',
                        outlet: 'loading'
                    });
                    return _this.span({
                        "class": 'badge',
                        outlet: 'loadingBadge'
                    });
                });
                return _this.ol({
                    "class": 'list-group',
                    outlet: 'list'
                });
            }));
        });
    };
    /*
    Section: Construction
     */
    CheckboxView.prototype.initialize = function () {
    };
    /*
    Section: Methods that must be overridden
     */
    CheckboxView.prototype.viewForItem = function (item) {
        return spacePen.$$(function () {
            var _this = this;
            return this.li({
                "class": 'event checkbox',
                'data-event-name': item.value
            }, function () {
                _this.input({ type: "checkbox", style: "margin-left: 0;", checked: !!item.checked, value: item.value });
                return _this.span(item.name, {
                    title: item.name, style: "padding-left: 6px;"
                });
            });
        });
    };
    CheckboxView.prototype.confirmed = function (item) {
        this.cancel();
        if (this.invokeNext) {
            this.invokeNext(item);
        }
        return null;
    };
    /*
    Section: Managing the list of items
     */
    CheckboxView.prototype.setItems = function (items) {
        this.items = items != null ? items : [];
        this.populateList();
        this.setLoading();
    };
    CheckboxView.prototype.getSelectedItem = function () {
        return this.getSelectedItemView().data('select-list-item');
    };
    CheckboxView.prototype.setMaxItems = function (maxItems) {
        this.maxItems = maxItems;
    };
    CheckboxView.prototype.populateList = function () {
        if (this.items == null) {
            return;
        }
        this.list.empty();
        var j;
        if (this.items.length) {
            this.setError(null);
            for (var i = j = 0, ref1 = Math.min(this.items.length, this.maxItems); 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
                var item = this.items[i];
                var itemView = $(this.viewForItem(item));
                itemView.data('select-list-item', item);
                this.list.append(itemView);
            }
            return this.selectItemView(this.list.find('li:first'));
        }
        else {
            return this.setError(this.getEmptyMessage(this.items.length, this.items.length));
        }
    };
    /*
    Section: Messages to the user
     */
    CheckboxView.prototype.setError = function (message) {
        if (message == null) {
            message = '';
        }
        if (message.length === 0) {
            return this.errors.text('').hide();
        }
        else {
            this.setLoading();
            return this.errors.text(message).show();
        }
    };
    CheckboxView.prototype.setLoading = function (message) {
        if (message == null) {
            message = '';
        }
        if (message.length === 0) {
            this.loading.text("");
            this.loadingBadge.text("");
            return this.loadingArea.hide();
        }
        else {
            this.setError();
            this.loading.text(message);
            return this.loadingArea.show();
        }
    };
    CheckboxView.prototype.getEmptyMessage = function (itemCount, filteredItemCount) {
        return 'No matches found';
    };
    /*
    Section: View Actions
     */
    CheckboxView.prototype.cancel = function () {
        this.list.empty();
        this.hide();
        return clearTimeout(this.scheduleTimeout);
    };
    CheckboxView.prototype.toggle = function () {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        }
        else {
            this.show();
        }
    };
    CheckboxView.prototype.show = function () {
        var _this = this;
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.disposable = new EventKit.CompositeDisposable();
        this.panel.show();
        this.message.text(this.question.message);
        // infer the generator somehow? based on the project information?  store in the project system??
        this.setItems(this.question.choices);
        if (this.question.default) {
            _.each(this.question.default, function (def) {
                var selected = _this.list.find('[data-event-name="' + _this.question.default + '"]');
                _.each(selected, function (x) { return _this.selectCheckbox(x); });
            });
        }
        $(document).on('keyup.checkbox-view', function (e) {
            if (e.which === 32) {
                _this.selectCheckbox(_this.getSelectedItemView());
                e.preventDefault();
                return false;
            }
        });
        //core:confirm
        this.disposable.add(atom.commands.add(document.body, 'core:move-up', function (event) {
            _this.selectPreviousItemView();
            event.stopPropagation();
        }));
        this.disposable.add(atom.commands.add(document.body, 'core:move-down', function (event) {
            _this.selectNextItemView();
            event.stopPropagation();
        }));
        this.disposable.add(atom.commands.add(document.body, 'core:move-to-top', function (event) {
            _this.selectItemView(_this.list.find('li:first'));
            _this.list.scrollToTop();
            event.stopPropagation();
        }));
        this.disposable.add(atom.commands.add(document.body, 'core:move-to-bottom', function (event) {
            _this.selectItemView(_this.list.find('li:last'));
            _this.list.scrollToBottom();
            event.stopPropagation();
        }));
        this.disposable.add(atom.commands.add(document.body, 'core:confirm', function (event) {
            _this.confirmSelection();
            event.stopPropagation();
        }));
        this.disposable.add(atom.commands.add(document.body, 'core:cancel', function (event) {
            _this.cancel();
            event.stopPropagation();
        }));
        this.list.on('mousedown', function (arg) {
            var target = arg.target;
            if (target === _this.list[0]) {
                return false;
            }
        });
        this.list.on('mousedown', 'li', function (e) {
            _this.selectItemView($(e.target).closest('li'));
            e.preventDefault();
            return false;
        });
        this.list.on('mouseup', 'li', function (e) {
            _this.selectCheckbox(_this.getSelectedItemView());
            e.preventDefault();
            return false;
        });
    };
    CheckboxView.prototype.hide = function () {
        this.disposable.dispose();
        this.panel && this.panel.hide();
        this.panel.destroy();
        this.panel = null;
        $(document).off('keyup.checkbox-view');
    };
    /*
    Section: public
     */
    CheckboxView.prototype.selectPreviousItemView = function () {
        var view = this.getSelectedItemView().prev();
        if (!view.length) {
            view = this.list.find('li:last');
        }
        return this.selectItemView(view);
    };
    CheckboxView.prototype.selectNextItemView = function () {
        var view = this.getSelectedItemView().next();
        if (!view.length) {
            view = this.list.find('li:first');
        }
        return this.selectItemView(view);
    };
    CheckboxView.prototype.selectItemView = function (view) {
        if (!view.length) {
            return;
        }
        this.list.find('.selected').removeClass('selected');
        // checkbox
        view.addClass('selected');
        return this.scrollToItemView(view);
    };
    CheckboxView.prototype.selectCheckbox = function (view) {
        if (!view.length) {
            return;
        }
        var input = view.find('input')[0];
        if (!input.disabled)
            input.checked = !input.checked;
    };
    CheckboxView.prototype.scrollToItemView = function (view) {
        var scrollTop = this.list.scrollTop();
        var desiredTop = view.position().top + scrollTop;
        var desiredBottom = desiredTop + view.outerHeight();
        if (desiredTop < scrollTop) {
            return this.list.scrollTop(desiredTop);
        }
        else if (desiredBottom > this.list.scrollBottom()) {
            return this.list.scrollBottom(desiredBottom);
        }
    };
    CheckboxView.prototype.getSelectedItemView = function () {
        return this.list.find('li.selected');
    };
    CheckboxView.prototype.confirmSelection = function () {
        var items = _.filter(this.list.find('input'), function (x) { return x.checked; }).map(function (z) { return z.value; });
        if (items) {
            return this.confirmed(items.join(','));
        }
        else {
            return this.cancel();
        }
    };
    CheckboxView.prototype.schedulePopulateList = function () {
        var _this = this;
        var populateCallback;
        clearTimeout(this.scheduleTimeout);
        populateCallback = function () {
            if (_this.isOnDom()) {
                return _this.populateList();
            }
        };
        return this.scheduleTimeout = setTimeout(populateCallback, this.inputThrottle);
    };
    return CheckboxView;
})(spacePen.View);
module.exports = CheckboxView;
