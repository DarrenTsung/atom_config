var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var rx_1 = require("rx");
var React = require('react');
var Convert = require('ansi-to-html');
var _ = require("lodash");
var react_client_component_1 = require("./react-client-component");
var TestResultsWindow = (function (_super) {
    __extends(TestResultsWindow, _super);
    function TestResultsWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = 'TestResultsWindow';
        this._convert = new Convert();
        this.state = { testResults: props.runTests.testResults };
    }
    TestResultsWindow.prototype.componentWillMount = function () {
        var _this = this;
        _super.prototype.componentWillMount.call(this);
        this.disposable.add(this.props.runTests.observe.output
            .buffer(this.props.runTests.observe.output.throttle(100), function () { return rx_1.Observable.timer(100); })
            .map(function (arr) { return arr[0]; })
            .subscribe(function (testResults) { return _this.setState({ testResults: testResults }); }));
        _.defer(_.bind(this.scrollToBottom, this));
    };
    TestResultsWindow.prototype.componentDidMount = function () {
        _super.prototype.componentWillMount.call(this);
    };
    TestResultsWindow.prototype.componentWillUnmount = function () {
        _super.prototype.componentWillUnmount.call(this);
    };
    TestResultsWindow.prototype.createItem = function (item, index) {
        return React.DOM.pre({
            key: "output-" + index,
            className: item.logLevel
        }, this._convert.toHtml(item.message).trim());
    };
    TestResultsWindow.prototype.scrollToBottom = function () {
        var item = React.findDOMNode(this).lastElementChild.lastElementChild;
        if (item)
            item.scrollIntoViewIfNeeded();
    };
    TestResultsWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'omni-output-pane-view native-key-bindings ' + (this.props['className'] || ''),
            tabIndex: -1
        }, React.DOM.div({
            className: 'messages-container'
        }, _.map(this.state.testResults, function (item, index) { return _this.createItem(item, index); })));
    };
    return TestResultsWindow;
})(react_client_component_1.ReactClientComponent);
exports.TestResultsWindow = TestResultsWindow;
