var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SpacePen = require('atom-space-pen-views');
var React = require('react');
var react_client_component_1 = require("./react-client-component");
var framework_selector_1 = require("../atom/framework-selector");
var $ = require('jquery');
var FrameworkSelectorComponent = (function (_super) {
    __extends(FrameworkSelectorComponent, _super);
    function FrameworkSelectorComponent(props, context) {
        _super.call(this, props, context);
        this.state = {
            frameworks: [],
            activeFramework: {}
        };
    }
    FrameworkSelectorComponent.prototype.componentWillMount = function () {
        _super.prototype.componentWillMount.call(this);
    };
    FrameworkSelectorComponent.prototype.render = function () {
        var _this = this;
        return React.DOM.a({
            href: '#',
            onClick: function (e) {
                var view = new FrameworkSelectorSelectListView(atom.workspace.getActiveTextEditor(), {
                    attachTo: '.framework-selector',
                    alignLeft: _this.props.alignLeft,
                    items: _this.state.frameworks,
                    save: function (framework) {
                        framework_selector_1.frameworkSelector.setActiveFramework(framework);
                        view.hide();
                    }
                });
                view.appendTo(atom.views.getView(atom.workspace));
                view.setItems();
                view.show();
            }
        }, this.state.activeFramework.FriendlyName);
    };
    return FrameworkSelectorComponent;
})(react_client_component_1.ReactClientComponent);
exports.FrameworkSelectorComponent = FrameworkSelectorComponent;
var FrameworkSelectorSelectListView = (function (_super) {
    __extends(FrameworkSelectorSelectListView, _super);
    function FrameworkSelectorSelectListView(editor, options) {
        _super.call(this);
        this.editor = editor;
        this.options = options;
        this.$.addClass('code-actions-overlay');
        this.filterEditorView.model.placeholderText = 'Filter list';
    }
    Object.defineProperty(FrameworkSelectorSelectListView.prototype, "$", {
        get: function () {
            return this;
        },
        enumerable: true,
        configurable: true
    });
    FrameworkSelectorSelectListView.prototype.setItems = function () {
        SpacePen.SelectListView.prototype.setItems.call(this, this.options.items);
    };
    FrameworkSelectorSelectListView.prototype.confirmed = function (item) {
        this.cancel(); //will close the view
        this.options.save(item);
        return null;
    };
    FrameworkSelectorSelectListView.prototype.show = function () {
        var _this = this;
        this.storeFocusedElement();
        setTimeout(function () { return _this.focusFilterEditor(); }, 100);
        var width = 180;
        var node = this[0];
        var attachTo = $(document.querySelectorAll(this.options.attachTo));
        var offset = attachTo.offset();
        if (offset) {
            if (this.options.alignLeft) {
                $(node).css({
                    position: 'fixed',
                    top: offset.top - node.clientHeight - 18,
                    left: offset.left,
                    width: width
                });
            }
            else {
                $(node).css({
                    position: 'fixed',
                    top: offset.top - node.clientHeight - 18,
                    left: offset.left - width + attachTo[0].clientWidth,
                    width: width
                });
            }
        }
    };
    FrameworkSelectorSelectListView.prototype.hide = function () {
        this.restoreFocus();
        this.remove();
    };
    FrameworkSelectorSelectListView.prototype.cancelled = function () {
        this.hide();
    };
    FrameworkSelectorSelectListView.prototype.getFilterKey = function () { return 'Name'; };
    FrameworkSelectorSelectListView.prototype.viewForItem = function (item) {
        if (!item) {
        }
        return SpacePen.$$(function () {
            var _this = this;
            return this.li({
                "class": 'event',
                'data-event-name': item.Name
            }, function () {
                return _this.span(item.FriendlyName, {
                    title: item.FriendlyName
                });
            });
        });
    };
    return FrameworkSelectorSelectListView;
})(SpacePen.SelectListView);
