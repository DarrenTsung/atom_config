var rx_1 = require("rx");
var _ = require('lodash');
var dock_window_1 = require('../views/dock-window');
var React = require('react');
var Dock = (function () {
    function Dock() {
        this._panes = [];
        this._buttons = [];
        this.required = true;
        this.title = 'Dock';
        this.description = 'The dock window used to show logs and diagnostics and other things.';
    }
    Dock.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(atom.commands.add('atom-workspace', "omnisharp-atom:toggle-dock", function () { return _this.toggle(); }));
        this.disposable.add(atom.commands.add('atom-workspace', "omnisharp-atom:show-dock", function () { return _this.show(); }));
        this.disposable.add(atom.commands.add('atom-workspace', "omnisharp-atom:hide-dock", function () { return _this.hide(); }));
        this.disposable.add(atom.commands.add('atom-workspace', 'core:close', function () { return _this.hide(); }));
        this.disposable.add(atom.commands.add('atom-workspace', 'core:cancel', function () { return _this.hide(); }));
    };
    Dock.prototype.attach = function () {
        var _this = this;
        var p = atom.workspace.addBottomPanel({
            item: document.createElement('span'),
            visible: false,
            priority: 1000
        });
        this.view = p.item.parentElement;
        this.view.classList.add('omnisharp-atom-pane');
        this.dock = React.render(React.createElement(dock_window_1.DockWindow, {
            panes: this._panes,
            buttons: this._buttons,
            panel: p
        }), this.view);
        this.disposable.add(rx_1.Disposable.create(function () {
            React.unmountComponentAtNode(_this.view);
            p.destroy();
            _this.view.remove();
        }));
    };
    Dock.prototype.dispose = function () {
        this.disposable.dispose();
    };
    Object.defineProperty(Dock.prototype, "isOpen", {
        get: function () { return this.dock && this.dock.isOpen; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Dock.prototype, "selected", {
        get: function () { return this.dock && this.dock.selected; },
        enumerable: true,
        configurable: true
    });
    Dock.prototype.toggle = function () {
        if (this.dock)
            this.dock.toggleView();
    };
    Dock.prototype.show = function () {
        if (this.dock)
            this.dock.showView();
    };
    Dock.prototype.hide = function () {
        if (this.dock)
            this.dock.hideView();
    };
    Dock.prototype.toggleWindow = function (selected) {
        this.dock.toggleWindow(selected);
    };
    Dock.prototype.selectWindow = function (selected) {
        this.dock.selectWindow(selected);
    };
    Dock.prototype.addWindow = function (id, title, view, props, options, parentDisposable) {
        var _this = this;
        if (options === void 0) { options = { priority: 1000 }; }
        var disposable = new rx_1.SingleAssignmentDisposable();
        var cd = new rx_1.CompositeDisposable();
        this.disposable.add(disposable);
        disposable.setDisposable(cd);
        if (parentDisposable)
            cd.add(parentDisposable);
        this._panes.push({ id: id, title: title, view: view, props: props, options: options, disposable: disposable });
        cd.add(atom.commands.add('atom-workspace', "omnisharp-atom:show-" + id, function () { return _this.selectWindow(id); }));
        cd.add(atom.commands.add('atom-workspace', "omnisharp-atom:toggle-" + id, function () { return _this.toggleWindow(id); }));
        if (options.closeable) {
            cd.add(atom.commands.add('atom-workspace', "omnisharp-atom:close-" + id, function () {
                _this.disposable.remove(disposable);
                if (_this.dock.selected === id) {
                    _this.dock.state.selected = 'output';
                    _this.hide();
                }
                disposable.dispose();
            }));
        }
        cd.add(rx_1.Disposable.create(function () {
            _.remove(_this._panes, { id: id });
            _this.dock.state.selected = 'output';
            _this.dock.forceUpdate();
        }));
        this._update();
        return disposable;
    };
    Dock.prototype.addButton = function (id, title, view, options, parentDisposable) {
        var _this = this;
        if (options === void 0) { options = { priority: 1000 }; }
        var disposable = new rx_1.SingleAssignmentDisposable();
        var cd = new rx_1.CompositeDisposable();
        this.disposable.add(disposable);
        disposable.setDisposable(cd);
        if (parentDisposable)
            cd.add(parentDisposable);
        this._buttons.push({ id: id, title: title, view: view, options: options, disposable: disposable });
        cd.add(rx_1.Disposable.create(function () {
            _.remove(_this._buttons, { id: id });
            _this.dock.forceUpdate();
        }));
        this._update();
        return disposable;
    };
    Dock.prototype._update = function () {
        // Sort th buttons!
        this._panes = _(this._panes)
            .sortBy(function (z) { return z.id; })
            .sort(function (a, b) {
            if (a.options.priority === b.options.priority)
                return 0;
            if (a.options.priority > b.options.priority)
                return 1;
            return -1;
        })
            .value();
        this._buttons = _(this._buttons)
            .sortBy(function (z) { return z.id; })
            .sort(function (a, b) {
            if (a.options.priority === b.options.priority)
                return 0;
            if (a.options.priority > b.options.priority)
                return 1;
            return -1;
        })
            .value();
        if (this.dock) {
            this.dock.props.panes = this._panes;
            this.dock.props.buttons = this._buttons;
            this.dock.forceUpdate();
        }
    };
    return Dock;
})();
exports.dock = new Dock;
