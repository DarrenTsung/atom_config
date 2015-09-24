var rx_1 = require("rx");
var lodash_1 = require('lodash');
var Omni = require('../../omni-sharp-server/omni');
var React = require('react');
var dock_1 = require("../atom/dock");
var buttons = [
    {
        name: 'enhanced-highlighting',
        config: 'omnisharp-atom.enhancedHighlighting',
        icon: 'icon-pencil',
        tooltip: 'Enable / Disable Enhanced Highlighting'
    }, {
        name: 'code-lens',
        config: 'omnisharp-atom.codeLens',
        icon: 'icon-telescope',
        tooltip: 'Enable / Disable Code Lens'
    }];
var FeatureEditorButtons = (function () {
    function FeatureEditorButtons() {
        this._active = false;
        this._showInEditor = true;
        this.required = false;
        this.title = "Show Editor Feature Buttons";
        this.description = "Shows feature toggle buttons in the editor.";
        this.default = true;
    }
    FeatureEditorButtons.prototype.activate = function () {
        this.disposable = new rx_1.CompositeDisposable();
    };
    FeatureEditorButtons.prototype.dispose = function () {
        this.disposable.dispose();
    };
    FeatureEditorButtons.prototype.setup = function (statusBar) {
        this.statusBar = statusBar;
        if (this._active) {
            this._attach();
        }
    };
    FeatureEditorButtons.prototype.attach = function () {
        if (this.statusBar) {
            this._attach();
        }
        this._active = true;
    };
    FeatureEditorButtons.prototype._attach = function () {
        var _this = this;
        lodash_1.each(buttons, function (button, index) { return _this._button(button, index); });
    };
    FeatureEditorButtons.prototype._button = function (button, index) {
        var _this = this;
        var name = button.name, config = button.config, icon = button.icon, tooltip = button.tooltip;
        var view = document.createElement("span");
        view.classList.add('inline-block', name + "-button", icon);
        view.style.display = 'none';
        view.onclick = function () { return atom.config.set(config, !atom.config.get(config)); };
        var tooltipDisposable;
        view.onmouseenter = function () {
            tooltipDisposable = atom.tooltips.add(view, { title: tooltip });
            _this.disposable.add(tooltipDisposable);
        };
        view.onmouseleave = function () {
            if (tooltipDisposable) {
                _this.disposable.remove(tooltipDisposable);
                tooltipDisposable.dispose();
            }
        };
        if (atom.config.get('grammar-selector.showOnRightSideOfStatusBar')) {
            var tile = this.statusBar.addRightTile({
                item: view,
                priority: 9 - index - 1
            });
        }
        else {
            var tile = this.statusBar.addLeftTile({
                item: view,
                priority: 11 + index + 1
            });
        }
        this.disposable.add(atom.config.observe(config, function (value) {
            if (value) {
                view.classList.add('text-success');
            }
            else {
                view.classList.remove('text-success');
            }
        }));
        this.disposable.add(rx_1.Disposable.create(function () {
            tile.destroy();
            view.remove();
        }));
        this.disposable.add(Omni.activeEditor
            .subscribe(function (editor) { return editor ? (view.style.display = '') : (view.style.display = 'none'); }));
    };
    return FeatureEditorButtons;
})();
var FeatureButtons = (function () {
    function FeatureButtons() {
        this._active = false;
        this._showInEditor = true;
        this.required = false;
        this.title = "Show Feature Toggles";
        this.description = "Shows feature toggle buttons in the omnisharp window.";
        this.default = true;
    }
    FeatureButtons.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        lodash_1.each(buttons, function (button, index) { return _this._button(button, index); });
    };
    FeatureButtons.prototype.dispose = function () {
        this.disposable.dispose();
    };
    FeatureButtons.prototype._button = function (button, index) {
        var _this = this;
        var name = button.name, config = button.config, icon = button.icon, tooltip = button.tooltip;
        var buttonDisposable;
        this.disposable.add(atom.config.observe(config, function (value) {
            if (buttonDisposable) {
                _this.disposable.remove(buttonDisposable);
                buttonDisposable.dispose();
            }
            buttonDisposable = _this._makeButton(button, index, value);
            _this.disposable.add(buttonDisposable);
        }));
        this.disposable.add(rx_1.Disposable.create(function () {
            buttonDisposable.dispose();
        }));
    };
    FeatureButtons.prototype._makeButton = function (button, index, enabled) {
        var _this = this;
        var name = button.name, config = button.config, icon = button.icon, tooltip = button.tooltip;
        var tooltipDisposable;
        var reactButton = React.DOM.a({
            id: icon + "-name",
            className: "btn " + icon + " " + (enabled ? 'btn-success' : ''),
            onClick: function () { return atom.config.set(config, !atom.config.get(config)); },
            onMouseEnter: function (e) {
                tooltipDisposable = atom.tooltips.add(e.currentTarget, { title: tooltip });
                _this.disposable.add(tooltipDisposable);
            },
            onMouseLeave: function (e) {
                if (tooltipDisposable) {
                    _this.disposable.remove(tooltipDisposable);
                    tooltipDisposable.dispose();
                }
            }
        });
        var buttonDisposable = dock_1.dock.addButton(name + "-button", tooltip, reactButton, { priority: 500 + index });
        return buttonDisposable;
    };
    return FeatureButtons;
})();
exports.featureButtons = new FeatureButtons();
exports.featureEditorButtons = new FeatureEditorButtons();
