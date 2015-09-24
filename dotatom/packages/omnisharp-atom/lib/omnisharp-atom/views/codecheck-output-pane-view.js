var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var path = require('path');
var Omni = require('../../omni-sharp-server/omni');
var React = require('react');
var $ = require('jquery');
var react_client_component_1 = require("./react-client-component");
var CodeCheckOutputWindow = (function (_super) {
    __extends(CodeCheckOutputWindow, _super);
    function CodeCheckOutputWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = 'FindPaneWindow';
        this.model = this.props.codeCheck;
        this.state = { diagnostics: this.model.displayDiagnostics, selectedIndex: this.model.selectedIndex };
    }
    CodeCheckOutputWindow.prototype.componentWillMount = function () {
        var _this = this;
        _super.prototype.componentWillMount.call(this);
        this.disposable.add(this.model.observe
            .updated
            .where(function (z) { return z.name === "displayDiagnostics"; })
            .subscribe(function (z) { return _this.setState({
            diagnostics: _this.model.displayDiagnostics
        }); }));
        this.disposable.add(this.model.observe
            .updated
            .where(function (z) { return z.name === "selectedIndex"; })
            .delay(0)
            .subscribe(function (z) { return _this.updateStateAndScroll(); }));
    };
    CodeCheckOutputWindow.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        React.findDOMNode(this).scrollTop = this.props.scrollTop();
        React.findDOMNode(this).onkeydown = function (e) { return _this.keydownPane(e); };
    };
    CodeCheckOutputWindow.prototype.componentWillUnmount = function () {
        _super.prototype.componentWillUnmount.call(this);
        React.findDOMNode(this).onkeydown = undefined;
    };
    CodeCheckOutputWindow.prototype.goToLine = function (location, index) {
        Omni.navigateTo(location);
        this.model.selectedIndex = index;
    };
    CodeCheckOutputWindow.prototype.keydownPane = function (e) {
        if (e.keyIdentifier == 'Down') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:next-diagnostic");
        }
        else if (e.keyIdentifier == 'Up') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:previous-diagnostic");
        }
        else if (e.keyIdentifier == 'Enter') {
            atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:go-to-diagnostic");
        }
    };
    CodeCheckOutputWindow.prototype.updateStateAndScroll = function () {
        var _this = this;
        this.setState({ selectedIndex: this.model.selectedIndex }, function () { return _this.scrollToItemView(); });
    };
    CodeCheckOutputWindow.prototype.scrollToItemView = function () {
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
    CodeCheckOutputWindow.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: 'codecheck-output-pane ' + (this.props['className'] || ''),
            onScroll: function (e) {
                _this.props.setScrollTop(e.currentTarget.scrollTop);
            },
            tabIndex: -1
        }, React.DOM.ol({
            style: { cursor: "pointer" }
        }, _.map(this.state.diagnostics, function (error, index) {
            return React.DOM.li({
                key: "code-check-" + error.LogLevel + "-" + error.FileName + "-(" + error.Line + "-" + error.Column + ")-(" + error.EndLine + "-" + error.EndColumn + ")-(" + error.Projects.join('-') + ")",
                className: ("codecheck " + error.LogLevel) + (index === _this.state.selectedIndex ? ' selected' : ''),
                onClick: function (e) { return _this.goToLine(error, index); }
            }, React.DOM.span({
                className: error.LogLevel === 'Error' ? 'fa fa-times-circle' : 'fa fa-exclamation-triangle'
            }), React.DOM.pre({
                className: "text-highlight"
            }, error.Text), React.DOM.pre({
                className: "inline-block"
            }, path.basename(error.FileName) + "(" + error.Line + "," + error.Column + ")"), React.DOM.pre({
                className: "text-subtle inline-block"
            }, "" + path.dirname(error.FileName)));
        })));
    };
    return CodeCheckOutputWindow;
})(react_client_component_1.ReactClientComponent);
exports.CodeCheckOutputWindow = CodeCheckOutputWindow;
