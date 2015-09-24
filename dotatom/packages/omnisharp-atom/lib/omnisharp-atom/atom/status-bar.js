var rx_1 = require("rx");
var status_bar_view_1 = require("../views/status-bar-view");
var StatusBar = (function () {
    function StatusBar() {
        this._active = false;
        this.required = true;
        this.title = 'Status Bar';
        this.description = 'Adds the OmniSharp status icon to the status bar.';
    }
    StatusBar.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(rx_1.Disposable.create(function () { return _this._active = false; }));
    };
    StatusBar.prototype.setup = function (statusBar) {
        this.statusBar = statusBar;
        if (this._active) {
            this._attach();
        }
    };
    StatusBar.prototype.attach = function () {
        if (this.statusBar) {
            this._attach();
        }
        this._active = true;
    };
    StatusBar.prototype._attach = function () {
        var _this = this;
        this.view = new status_bar_view_1.StatusBarElement();
        var tile = this.statusBar.addLeftTile({
            item: this.view,
            priority: -10000
        });
        this.disposable.add(this.view);
        this.disposable.add(rx_1.Disposable.create(function () {
            tile.destroy();
            _this.view.remove();
        }));
    };
    StatusBar.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return StatusBar;
})();
exports.statusBar = new StatusBar;
