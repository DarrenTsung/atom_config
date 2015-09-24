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
var OutputWindow = (function (_super) {
    __extends(OutputWindow, _super);
    function OutputWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = "OutputWindow";
        this._convert = new Convert();
        this.state = { output: [] };
    }
    OutputWindow.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        this.disposable.add(server_information_1.server.observe.output
            .subscribe(function (z) { return _this.setState({ output: z }, function () { return _this.scrollToBottom(); }); }));
        _.defer(_.bind(this.scrollToBottom, this));
    };
    OutputWindow.prototype.scrollToBottom = function () {
        var item = React.findDOMNode(this).lastElementChild.lastElementChild;
        if (item)
            item.scrollIntoViewIfNeeded();
    };
    OutputWindow.prototype.createItem = function (item, index) {
        return React.DOM.pre({
            key: "output-" + index,
            className: item.logLevel,
            dangerouslySetInnerHTML: { __html: this._convert.toHtml(item.message).trim() }
        });
    };
    OutputWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'omni-output-pane-view native-key-bindings ' + (this.props['className'] || ''),
            tabIndex: -1
        }, React.DOM.div({
            className: 'messages-container'
        }, _.map(this.state.output, function (item, index) { return _this.createItem(item, index); })));
    };
    return OutputWindow;
})(react_client_component_1.ReactClientComponent);
exports.OutputWindow = OutputWindow;
