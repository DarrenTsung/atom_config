var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var path_1 = require("path");
var React = require('react');
var react_client_component_1 = require("./react-client-component");
var omnisharp_client_1 = require("omnisharp-client");
var $ = require('jquery');
function truncateStringReverse(str, maxLength) {
    if (maxLength === void 0) { maxLength = 55; }
    var reversedString = _.toArray(str).reverse().join('');
    return _.toArray(_.trunc(reversedString, maxLength)).reverse().join('');
}
var SolutionStatusCard = (function (_super) {
    __extends(SolutionStatusCard, _super);
    function SolutionStatusCard(props, context) {
        _super.call(this, props, context);
        this.displayName = 'Card';
        //this.model = this.props.codeCheck;
        this.state = { model: props.model, count: props.count };
    }
    SolutionStatusCard.prototype.componentWillMount = function () {
        _super.prototype.componentWillMount.call(this);
    };
    SolutionStatusCard.prototype.componentWillUpdate = function (nextProps, nextState) {
        var _this = this;
        if (this.state.model.uniqueId !== nextState.model.uniqueId && this.updatesDisposable) {
            this.disposable.remove(this.updatesDisposable);
            this.updatesDisposable.dispose();
            this.updatesDisposable = nextState.model.observe.updates.debounce(500).subscribe(function () { return _this.setState({}); });
        }
    };
    SolutionStatusCard.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        this.updatesDisposable = this.state.model.observe.updates.debounce(500).subscribe(function () { return _this.setState({}); });
        this.disposable.add(this.updatesDisposable);
        this.verifyPosition();
    };
    SolutionStatusCard.prototype.componentDidUpdate = function () {
        _.delay(this.verifyPosition.bind(this), 50);
    };
    SolutionStatusCard.prototype.componentWillUnmount = function () {
        _super.prototype.componentWillUnmount.call(this);
    };
    SolutionStatusCard.prototype.updateCard = function (state) {
        this.setState(state);
    };
    SolutionStatusCard.prototype.verifyPosition = function () {
        var node = React.findDOMNode(this);
        var offset = $(document.querySelectorAll(this.props.attachTo)).offset();
        if (offset) {
            $(node).css({
                position: 'fixed',
                top: offset.top - node.clientHeight,
                left: offset.left
            });
        }
    };
    SolutionStatusCard.prototype.getButtons = function () {
        var buttons = [];
        if (this.state.model.isReady) {
            buttons.push(React.DOM.button({
                type: 'button',
                className: 'btn btn-xs btn-error',
                onClick: function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:stop-server'); }
            }, React.DOM.span({ className: 'fa fa-stop' }), 'Stop'));
        }
        else if (this.state.model.isOff) {
            buttons.push(React.DOM.button({
                type: 'button',
                className: 'btn btn-xs btn-success',
                onClick: function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:start-server'); }
            }, React.DOM.span({ className: 'fa fa-play' }), 'Start'));
        }
        if (this.state.model.isOn) {
            buttons.push(React.DOM.button({
                type: 'button',
                className: 'btn btn-xs btn-info',
                onClick: function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:restart-server'); }
            }, React.DOM.span({ className: 'fa fa-refresh' }), 'Restart'));
        }
        return buttons;
    };
    SolutionStatusCard.prototype.getProjects = function () {
        var _this = this;
        var projects = [];
        return this.state.model.projects.map(function (project) {
            var path = truncateStringReverse(project.path.replace(_this.state.model.path, ''), 24);
            return React.DOM.div({ className: 'project name', title: path + " [" + project.frameworks.filter(function (z) { return z.Name !== 'all'; }).map(function (x) { return x.FriendlyName; }) + "]" }, project.name);
        });
    };
    SolutionStatusCard.prototype.getStatusText = function () {
        if (this.state.model.state === omnisharp_client_1.DriverState.Connected) {
            return "Online";
        }
        else if (this.state.model.state === omnisharp_client_1.DriverState.Connecting) {
            return "Loading";
        }
        else if (this.state.model.state === omnisharp_client_1.DriverState.Disconnected) {
            return "Offline";
        }
        return omnisharp_client_1.DriverState[this.state.model.state];
    };
    SolutionStatusCard.prototype.render = function () {
        if (!this.state.model) {
            return React.DOM.div({ className: 'omnisharp-card' });
        }
        var path = truncateStringReverse(this.state.model.path);
        var stats = [
            React.DOM.div({
                className: 'meta-controls'
            }, React.DOM.div({
                className: 'btn-group'
            }, this.getButtons()))
        ];
        stats.unshift(React.DOM.span({
            className: "pull-left stats-item " + (omnisharp_client_1.DriverState[this.state.model.state].toLowerCase())
        }, React.DOM.span({
            className: ''
        }, React.DOM.span({
            className: 'icon icon-zap'
        }), this.getStatusText())));
        if (this.state.model.runtime) {
            stats.unshift(React.DOM.span({
                className: "pull-right stats-item"
            }, React.DOM.span({
                className: 'icon icon-versions'
            }), React.DOM.span({
                className: ''
            }, this.state.model.runtime)));
        }
        if (this.state.model.projects.length) {
            var projects = React.DOM.div({ className: 'meta meta-projects' }, React.DOM.div({ className: 'header' }, 'Projects'), this.getProjects());
        }
        var children = [
            (_a = React.DOM).div.apply(_a, [{
                className: 'body'
            }, React.DOM.h4({
                className: 'name'
            }, React.DOM.span({}, path_1.basename(this.state.model.path) + " (" + this.state.model.index + ")")), React.DOM.span({
                className: 'description'
            }, path)].concat(stats)),
            projects || ''
        ];
        if (this.state.count > 1) {
            children.unshift(React.DOM.div({ className: 'selector btn-group btn-group-xs' }, React.DOM.span({
                className: "btn btn-xs icon icon-triangle-left",
                onClick: function (e) { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:previous-solution-status'); }
            }), React.DOM.span({
                className: "btn btn-xs icon icon-triangle-right",
                onClick: function (e) { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:next-solution-status'); }
            })));
        }
        return (_b = React.DOM).div.apply(_b, [{
            className: 'omnisharp-card'
        }].concat(children));
        var _a, _b;
    };
    return SolutionStatusCard;
})(react_client_component_1.ReactClientComponent);
exports.SolutionStatusCard = SolutionStatusCard;
