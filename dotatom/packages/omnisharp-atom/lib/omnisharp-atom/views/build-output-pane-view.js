var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Convert = require('ansi-to-html');
var _ = require('lodash');
var React = require('react');
var react_client_component_1 = require("./react-client-component");
var server_information_1 = require('../features/server-information');
var BuildOutputWindow = (function (_super) {
    __extends(BuildOutputWindow, _super);
    function BuildOutputWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = "BuildOutputWindow";
        this._convert = new Convert();
        this.state = { output: [] };
    }
    BuildOutputWindow.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        this.disposable.add(server_information_1.server.observe.output
            .subscribe(function (z) { return _this.setState({ output: z }, function () { return _this.scrollToBottom(); }); }));
        this.scrollToBottom();
    };
    BuildOutputWindow.prototype.scrollToBottom = function () {
        var item = React.findDOMNode(this).lastElementChild.lastElementChild;
        if (item)
            item.scrollIntoViewIfNeeded();
    };
    BuildOutputWindow.prototype.createItem = function (item) {
        return React.DOM.pre({
            className: item.logLevel
        }, this._convert.toHtml(item.message).trim());
    };
    BuildOutputWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'build-output-pane-view native-key-bindings ' + (this.props['className'] || ''),
            tabIndex: -1
        }, React.DOM.div({
            className: 'messages-container'
        }, _.map(this.state.output, function (item) { return _this.createItem(item); })));
    };
    return BuildOutputWindow;
})(react_client_component_1.ReactClientComponent);
exports.BuildOutputWindow = BuildOutputWindow;
