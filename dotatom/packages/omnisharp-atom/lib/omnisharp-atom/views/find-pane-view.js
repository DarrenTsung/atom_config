var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var Omni = require('../../omni-sharp-server/omni');
var React = require('react');
var path = require('path');
var $ = require('jquery');
var react_client_component_1 = require("./react-client-component");
var FindWindow = (function (_super) {
    __extends(FindWindow, _super);
    function FindWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = 'FindPaneWindow';
        this.model = this.props.findUsages;
        this.state = { usages: this.model.usages, selectedIndex: this.model.selectedIndex };
    }
    FindWindow.prototype.componentWillMount = function () {
        var _this = this;
        _super.prototype.componentWillMount.call(this);
        this.disposable.add(this.model.observe
            .updated
            .where(function (z) { return z.name === "usages"; })
            .subscribe(function (z) { return _this.setState({
            usages: _this.model.usages
        }); }));
        this.disposable.add(this.model.observe
            .updated
            .where(function (z) { return z.name === "selectedIndex"; })
            .delay(0)
            .subscribe(function (z) { return _this.updateStateAndScroll(); }));
    };
    FindWindow.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        React.findDOMNode(this).scrollTop = this.props.scrollTop();
        React.findDOMNode(this).onkeydown = function (e) { return _this.keydownPane(e); };
    };
    FindWindow.prototype.componentWillUnmount = function () {
        _super.prototype.componentWillUnmount.call(this);
        React.findDOMNode(this).onkeydown = undefined;
    };
    FindWindow.prototype.updateStateAndScroll = function () {
        var _this = this;
        this.setState({ selectedIndex: this.model.selectedIndex }, function () { return _this.scrollToItemView(); });
    };
    FindWindow.prototype.scrollToItemView = function () {
        var self = $(React.findDOMNode(this));
        var item = self.find("li.selected");
        if (!item || !item.position())
            return;
        var pane = self;
        var scrollTop = pane.scrollTop();
        var desiredTop = item.position().top + scrollTop;
        var desiredBottom = desiredTop + item.outerHeight();
        if (desiredTop < scrollTop)
            pane.scrollTop(desiredTop);
        else if (desiredBottom > pane.scrollBottom())
            pane.scrollBottom(desiredBottom);
    };
    FindWindow.prototype.keydownPane = function (e) {
        if (e.keyIdentifier == 'Down') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:next-usage");
        }
        else if (e.keyIdentifier == 'Up') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:previous-usage");
        }
        else if (e.keyIdentifier == 'Enter') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:go-to-usage");
        }
    };
    FindWindow.prototype.gotoUsage = function (quickfix, index) {
        Omni.navigateTo(quickfix);
        this.model.selectedIndex = index;
    };
    FindWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'error-output-pane ' + (this.props['className'] || ''),
            onScroll: function (e) {
                _this.props.setScrollTop(e.currentTarget.scrollTop);
            },
            tabIndex: -1
        }, React.DOM.ol({
            style: { cursor: "pointer" }
        }, _.map(this.state.usages, function (usage, index) {
            return React.DOM.li({
                key: "quick-fix-" + usage.FileName + "-(" + usage.Line + "-" + usage.Column + ")-(" + usage.EndLine + "-" + usage.EndColumn + ")-(" + usage.Projects.join('-') + ")",
                className: 'find-usages' + (index === _this.state.selectedIndex ? ' selected' : ''),
                onClick: function (e) { return _this.gotoUsage(usage, index); }
            }, React.DOM.pre({
                className: "text-highlight"
            }, usage.Text), React.DOM.pre({
                className: "inline-block"
            }, path.basename(usage.FileName) + "(" + usage.Line + "," + usage.Column + ")"), React.DOM.pre({
                className: "text-subtle inline-block"
            }, "" + path.dirname(usage.FileName)));
        })));
    };
    return FindWindow;
})(react_client_component_1.ReactClientComponent);
exports.FindWindow = FindWindow;
