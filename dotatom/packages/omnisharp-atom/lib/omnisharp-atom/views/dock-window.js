var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
//var Convert = require('ansi-to-html')
var _ = require('lodash');
var rx_1 = require("rx");
var React = require('react');
var react_client_component_1 = require("./react-client-component");
var DockWindows = (function (_super) {
    __extends(DockWindows, _super);
    function DockWindows(props, context) {
        _super.call(this, props, context);
        this.state = {};
    }
    DockWindows.prototype.panelButton = function (_a) {
        var _this = this;
        var id = _a.id, title = _a.title, options = _a.options, disposable = _a.disposable;
        var children = [React.DOM.span({ className: 'text' }, title)];
        if (options.closeable) {
            children.push(React.DOM.span({
                className: 'fa fa-times-circle close-pane',
                key: 'close',
                onClick: function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    disposable.dispose();
                }
            }));
        }
        return (_b = React.DOM).button.apply(_b, [{
            className: "btn btn-default btn-fix " + (this.props.selected === id ? 'selected' : '') + " " + (options.closeable ? 'closeable' : ''),
            key: id,
            onClick: function (e) {
                e.stopPropagation();
                e.preventDefault();
                _this.props.setSelected(id);
                _this.setState({});
            }
        }].concat(children));
        var _b;
    };
    DockWindows.prototype.button = function (_a) {
        var view = _a.view;
        return view;
    };
    DockWindows.prototype.getPanelButtons = function () {
        var _this = this;
        return _.map(this.props.panes, function (e) { return _this.panelButton(e); });
    };
    DockWindows.prototype.getButtons = function () {
        var _this = this;
        return _.map(this.props.buttons, function (e) { return _this.button(e); });
    };
    DockWindows.prototype.render = function () {
        return React.DOM.div({
            className: "panel-heading clearfix"
        }, React.DOM.div({ className: 'btn-toolbar pull-left' }, React.DOM.div({ className: 'btn-group btn-toggle' }, this.getPanelButtons())), React.DOM.div({ className: "btn-well pull-right btn-group" }, this.getButtons()));
    };
    return DockWindows;
})(react_client_component_1.ReactClientComponent);
var DockWindow = (function (_super) {
    __extends(DockWindow, _super);
    function DockWindow(props, context) {
        _super.call(this, props, context);
        this.displayName = "DockWindow";
        this.visible = false;
        this.height = 0;
        this.tempHeight = 0;
        this.state = { selected: 'output', fontSize: atom.config.get('editor.fontSize') };
    }
    Object.defineProperty(DockWindow.prototype, "selected", {
        get: function () { return this.state.selected; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockWindow.prototype, "isOpen", {
        get: function () { return this.visible; },
        enumerable: true,
        configurable: true
    });
    DockWindow.prototype.componentWillMount = function () {
        _super.prototype.componentWillMount.call(this);
    };
    DockWindow.prototype.componentDidMount = function () {
        var _this = this;
        _super.prototype.componentDidMount.call(this);
        var node = React.findDOMNode(this);
        this.height = node.clientHeight;
        atom.config.observe('editor.fontSize', function (size) {
            _this.setState({ fontSize: size });
        });
    };
    DockWindow.prototype.updateState = function (cb) {
        var _this = this;
        this.setState({}, function () { return _this.updateAtom(cb); });
    };
    DockWindow.prototype.updateAtom = function (cb) {
        if (this.props.panel.visible !== this.visible) {
            if (this.visible) {
                var node = React.findDOMNode(this);
                this.props.panel.show();
                this.height = node.clientHeight;
            }
            else {
                this.props.panel.hide();
            }
        }
        if (cb)
            cb();
    };
    DockWindow.prototype.showView = function () {
        this.visible = true;
        this.updateState();
    };
    DockWindow.prototype.doShowView = function () {
        this.visible = true;
    };
    DockWindow.prototype.hideView = function () {
        this.doHideView();
        this.updateState();
    };
    DockWindow.prototype.doHideView = function () {
        this.visible = false;
        atom.workspace.getActivePane().activate();
        atom.workspace.getActivePane().activateItem();
    };
    DockWindow.prototype.toggleView = function () {
        if (this.visible) {
            this.doHideView();
        }
        else {
            this.doShowView();
        }
        this.updateState();
    };
    DockWindow.prototype.toggleWindow = function (selected) {
        if (this.visible && this.state.selected === selected) {
            this.hideView();
            return;
        }
        this.selectWindow(selected);
    };
    DockWindow.prototype.isSelected = function (key) {
        if (this.state.selected) {
            return "omnisharp-atom-output " + key + "-output selected";
        }
        return '';
    };
    DockWindow.prototype.selectWindow = function (selected) {
        var _this = this;
        if (!this.visible)
            this.doShowView();
        this.state.selected = selected;
        // Focus the panel!
        this.updateState(function () {
            var panel = React.findDOMNode(_this).querySelector('.omnisharp-atom-output.selected');
            if (panel)
                panel.focus();
        });
    };
    DockWindow.prototype.getWindows = function () {
        var window = _.find(this.props.panes, { id: this.state.selected });
        if (!this.state.selected || !window)
            return React.DOM.span({});
        if (window) {
            var props = _.clone(window.props);
            props.className = (this.isSelected((window.id)) + ' ' + (props.className || ''));
            props.key = window.id;
            return React.createElement(window.view, props);
        }
    };
    DockWindow.prototype.render = function () {
        var _this = this;
        if (!this.visible) {
            return React.DOM.span({
                style: {
                    display: 'none'
                }
            });
        }
        var fontSize = this.state.fontSize - 1;
        if (fontSize <= 0)
            fontSize = 1;
        var insetProps = {
            className: "inset-panel font-size-" + fontSize
        };
        if (this.height || this.tempHeight) {
            insetProps.style = { height: this.height + this.tempHeight };
        }
        return React.DOM.div(insetProps, React.createElement(Resizer, {
            className: 'omnisharp-atom-output-resizer',
            update: function (_a) {
                var top = _a.top;
                console.log(top);
                _this.tempHeight = -(top);
                _this.setState({});
            },
            done: function () {
                _this.height = _this.height + _this.tempHeight;
                _this.tempHeight = 0;
                _this.setState({});
            }
        }), React.createElement(DockWindows, { selected: this.state.selected, setSelected: this.selectWindow.bind(this), panes: this.props.panes, buttons: this.props.buttons }), this.getWindows());
    };
    return DockWindow;
})(react_client_component_1.ReactClientComponent);
exports.DockWindow = DockWindow;
function makeRxReactEventHandler() {
    var subject = new rx_1.Subject();
    return {
        handler: subject.onNext.bind(subject),
        observable: subject.asObservable()
    };
}
var Resizer = (function (_super) {
    __extends(Resizer, _super);
    function Resizer() {
        _super.apply(this, arguments);
        this._mousedown = makeRxReactEventHandler();
        this.disposable = new rx_1.CompositeDisposable();
    }
    Resizer.prototype.componentDidMount = function () {
        var _this = this;
        var node = React.findDOMNode(this);
        var mousemove = rx_1.Observable.fromEvent(document.body, 'mousemove').share();
        var mouseup = rx_1.Observable.fromEvent(document.body, 'mouseup').share();
        var mousedown = this._mousedown.observable;
        var mousedrag = mousedown.selectMany(function (md) {
            var startX = md.clientX + window.scrollX, startY = md.clientY + window.scrollY, startLeft = parseInt(md.target.style.left, 10) || 0, startTop = parseInt(md.target.style.top, 10) || 0;
            return mousemove.map(function (mm) {
                mm.preventDefault();
                return {
                    left: startLeft + mm.clientX - startX,
                    top: startTop + mm.clientY - startY
                };
            }).takeUntil(mouseup);
        });
        mousedown.flatMapLatest(function (x) { return mousemove.skipUntil(mouseup); }).subscribe(function () { return _this.props.done(); });
        this.disposable.add(mousedrag.subscribe(this.props.update));
    };
    Resizer.prototype.componentWillUnmount = function () {
        var node = React.findDOMNode(this);
        this.disposable.dispose();
    };
    Resizer.prototype.render = function () {
        var _this = this;
        return React.DOM.div({
            className: this.props.className,
            onMouseDown: function (e) { return _this._mousedown.handler(e); }
        });
    };
    return Resizer;
})(React.Component);
exports.Resizer = Resizer;
