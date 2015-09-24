var rx_1 = require("rx");
var lodash_1 = require("lodash");
var AtomProjectTracker = (function () {
    function AtomProjectTracker() {
        this._disposable = new rx_1.CompositeDisposable();
        this._projectPaths = [];
        this._addedSubject = new rx_1.Subject();
        this._removedSubject = new rx_1.Subject();
    }
    Object.defineProperty(AtomProjectTracker.prototype, "added", {
        get: function () { return this._addedSubject; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AtomProjectTracker.prototype, "removed", {
        get: function () { return this._removedSubject; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AtomProjectTracker.prototype, "paths", {
        get: function () { return this._projectPaths.slice(); },
        enumerable: true,
        configurable: true
    });
    AtomProjectTracker.prototype.activate = function () {
        var _this = this;
        // monitor atom project paths
        this.updatePaths(atom.project.getPaths());
        this._disposable.add(atom.project.onDidChangePaths(function (paths) { return _this.updatePaths(paths); }));
    };
    AtomProjectTracker.prototype.updatePaths = function (paths) {
        var addedPaths = lodash_1.difference(paths, this._projectPaths);
        var removedPaths = lodash_1.difference(this._projectPaths, paths);
        for (var _i = 0; _i < addedPaths.length; _i++) {
            var project = addedPaths[_i];
            this._addedSubject.onNext(project);
        }
        for (var _a = 0; _a < removedPaths.length; _a++) {
            var project = removedPaths[_a];
            this._removedSubject.onNext(project);
        }
        this._projectPaths = paths;
    };
    AtomProjectTracker.prototype.dispose = function () {
        this._disposable.dispose();
    };
    return AtomProjectTracker;
})();
exports.AtomProjectTracker = AtomProjectTracker;
