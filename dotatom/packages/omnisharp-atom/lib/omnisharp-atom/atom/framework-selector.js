var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var framework_selector_view_1 = require('../views/framework-selector-view');
var React = require('react');
var FrameworkSelector = (function () {
    function FrameworkSelector() {
        this._active = false;
        this.required = true;
        this.title = 'Framework Selector';
        this.description = 'Lets you select the framework you\'re currently targeting.';
    }
    FrameworkSelector.prototype.activate = function () {
        this.disposable = new rx_1.CompositeDisposable();
    };
    FrameworkSelector.prototype.setup = function (statusBar) {
        this.statusBar = statusBar;
        if (this._active) {
            this._attach();
        }
    };
    FrameworkSelector.prototype.attach = function () {
        if (this.statusBar) {
            this._attach();
        }
        this._active = true;
    };
    FrameworkSelector.prototype._attach = function () {
        var _this = this;
        this.view = document.createElement("span");
        this.view.classList.add('inline-block');
        this.view.classList.add('framework-selector');
        this.view.style.display = 'none';
        if (atom.config.get('grammar-selector.showOnRightSideOfStatusBar')) {
            var tile = this.statusBar.addRightTile({
                item: this.view,
                priority: 9
            });
        }
        else {
            var tile = this.statusBar.addLeftTile({
                item: this.view,
                priority: 11
            });
        }
        this._component = React.render(React.createElement(framework_selector_view_1.FrameworkSelectorComponent, { alignLeft: !atom.config.get('grammar-selector.showOnRightSideOfStatusBar') }), this.view);
        this.disposable.add(rx_1.Disposable.create(function () {
            React.unmountComponentAtNode(_this.view);
            tile.destroy();
            _this.view.remove();
        }));
        this.disposable.add(Omni.activeEditor
            .where(function (z) { return !z; })
            .subscribe(function () { return _this.view.style.display = 'none'; }));
        this.disposable.add(Omni.activeProject
            .where(function (z) { return z.frameworks.length === 1; })
            .subscribe(function () { return _this.view.style.display = 'none'; }));
        this.disposable.add(Omni.activeProject
            .subscribe(function (project) {
            _this.view.style.display = '';
            _this.project = project;
            var frameworks = project.frameworks, activeFramework = project.activeFramework;
            _this._component.setState({ frameworks: frameworks, activeFramework: activeFramework });
        }));
    };
    FrameworkSelector.prototype.dispose = function () {
        this.disposable.dispose();
    };
    FrameworkSelector.prototype.setActiveFramework = function (framework) {
        if (this.project) {
            this.project.activeFramework = framework;
            this._component.setState({ activeFramework: framework });
        }
    };
    return FrameworkSelector;
})();
exports.frameworkSelector = new FrameworkSelector;
