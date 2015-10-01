var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var dock_1 = require("../atom/dock");
var find_pane_view_1 = require("../views/find-pane-view");
var FindUsages = (function () {
    function FindUsages() {
        this.selectedIndex = 0;
        this.scrollTop = 0;
        this.usages = [];
        this.required = true;
        this.title = 'Find Usages / Go To Implementations';
        this.description = 'Adds support to find usages, and go to implementations';
    }
    FindUsages.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var observable = rx_1.Observable.merge(
        // Listen to find usages
        Omni.listener.observeFindusages, 
        // We also want find implementations, where we found more than one
        Omni.listener.observeFindimplementations
            .where(function (z) { return z.response.QuickFixes && z.response.QuickFixes.length > 1; }))
            .map(function (z) { return z.response.QuickFixes || []; })
            .share();
        var updated = rx_1.Observable.ofObjectChanges(this);
        this.observe = {
            find: observable,
            // NOTE: We cannot do the same for find implementations because find implementation
            //      just goes to the item if only one comes back.
            open: Omni.listener.requests.where(function (z) { return !z.silent && z.command === "findusages"; }).map(function () { return true; }),
            reset: Omni.listener.requests.where(function (z) { return !z.silent && (z.command === "findimplementations" || z.command === "findusages"); }).map(function () { return true; }),
            updated: updated
        };
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:find-usages", function () {
            Omni.request(function (client) { return client.findusages({}); });
        }));
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:go-to-implementation", function () {
            Omni.request(function (client) { return client.findimplementations({}); });
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:next-usage', function () {
            _this.updateSelectedItem(_this.selectedIndex + 1);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:go-to-usage', function () {
            if (_this.usages[_this.selectedIndex])
                Omni.navigateTo(_this.usages[_this.selectedIndex]);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:previous-usage', function () {
            _this.updateSelectedItem(_this.selectedIndex - 1);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:go-to-next-usage', function () {
            _this.updateSelectedItem(_this.selectedIndex + 1);
            if (_this.usages[_this.selectedIndex])
                Omni.navigateTo(_this.usages[_this.selectedIndex]);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:go-to-previous-usage', function () {
            _this.updateSelectedItem(_this.selectedIndex - 1);
            if (_this.usages[_this.selectedIndex])
                Omni.navigateTo(_this.usages[_this.selectedIndex]);
        }));
        this.disposable.add(this.observe.find.subscribe(function (s) {
            _this.usages = s;
        }));
        this.disposable.add(rx_1.Observable.merge(exports.findUsages.observe.find.map(function (z) { return true; }), exports.findUsages.observe.open.map(function (z) { return true; })).subscribe(function () {
            _this.ensureWindowIsCreated();
            dock_1.dock.selectWindow("find");
        }));
        this.disposable.add(this.observe.reset.subscribe(function () {
            _this.usages = [];
            _this.scrollTop = 0;
            _this.selectedIndex = 0;
        }));
        this.disposable.add(Omni.listener.observeFindimplementations.subscribe(function (data) {
            if (data.response.QuickFixes.length == 1) {
                Omni.navigateTo(data.response.QuickFixes[0]);
            }
        }));
    };
    FindUsages.prototype.updateSelectedItem = function (index) {
        if (index < 0)
            index = 0;
        if (index >= this.usages.length)
            index = this.usages.length - 1;
        if (this.selectedIndex !== index)
            this.selectedIndex = index;
    };
    FindUsages.prototype.ensureWindowIsCreated = function () {
        var _this = this;
        if (!this.window) {
            this.window = new rx_1.CompositeDisposable();
            var windowDisposable = dock_1.dock.addWindow('find', 'Find', find_pane_view_1.FindWindow, {
                scrollTop: function () { return _this.scrollTop; },
                setScrollTop: function (scrollTop) { return _this.scrollTop = scrollTop; },
                findUsages: this
            }, {
                priority: 2000,
                closeable: true
            }, this.window);
            this.window.add(windowDisposable);
            this.window.add(rx_1.Disposable.create(function () {
                _this.disposable.remove(_this.window);
                _this.window = null;
            }));
            this.disposable.add(this.window);
        }
    };
    FindUsages.prototype.dispose = function () {
        this.disposable.dispose();
    };
    FindUsages.prototype.navigateToSelectedItem = function () {
        Omni.navigateTo(this.usages[this.selectedIndex]);
    };
    return FindUsages;
})();
exports.findUsages = new FindUsages;
