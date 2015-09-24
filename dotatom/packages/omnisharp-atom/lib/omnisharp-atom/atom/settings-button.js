var rx_1 = require("rx");
var React = require('react');
var dock_1 = require("../atom/dock");
var SettingsButton = (function () {
    function SettingsButton() {
        this._active = false;
        this.required = true;
        this.title = "Show Settings button";
        this.tooltip = "Show Settings";
        this.description = "Shows the settings button on the OmniSharp Dock";
        this.default = true;
    }
    SettingsButton.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var tooltip;
        var button = React.DOM.a({
            className: "btn icon-gear",
            onClick: function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), "omnisharp-atom:settings"); },
            onMouseEnter: function (e) {
                tooltip = atom.tooltips.add(e.currentTarget, { title: _this.tooltip });
                _this.disposable.add(tooltip);
            },
            onMouseLeave: function (e) {
                if (tooltip) {
                    _this.disposable.remove(tooltip);
                    tooltip.dispose();
                }
            }
        });
        this.disposable.add(dock_1.dock.addButton('settings-button', 'Settings', button, { priority: 999 }));
    };
    SettingsButton.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return SettingsButton;
})();
exports.settingsButton = new SettingsButton();
