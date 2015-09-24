var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var React = require('react');
var react_client_component_1 = require("./react-client-component");
var CommandOutputWindow = (function (_super) {
    __extends(CommandOutputWindow, _super);
    function CommandOutputWindow(props, context) {
        var _this = this;
        _super.call(this, props, context);
        this.displayName = "CommandOutputWindow";
        this.state = { output: props.output };
        this.disposable.add(this.props.update.subscribe(function (output) {
            return _this.setState({ output: output }, function () { return _this.scrollToBottom(); });
        }));
        _.defer(_.bind(this.scrollToBottom, this));
    }
    CommandOutputWindow.prototype.scrollToBottom = function () {
        var item = React.findDOMNode(this).lastElementChild.lastElementChild;
        if (item)
            item.scrollIntoViewIfNeeded();
    };
    CommandOutputWindow.prototype.createItem = function (item, index) {
        return React.DOM.pre({
            key: "output-" + index
        }, item.message.trim());
    };
    CommandOutputWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'omni-output-pane-view native-key-bindings ' + (this.props['className'] || ''),
            tabIndex: -1
        }, React.DOM.div({
            className: 'messages-container'
        }, _.map(this.state.output, function (item, index) { return _this.createItem(item, index); })));
    };
    return CommandOutputWindow;
})(react_client_component_1.ReactClientComponent);
exports.CommandOutputWindow = CommandOutputWindow;
