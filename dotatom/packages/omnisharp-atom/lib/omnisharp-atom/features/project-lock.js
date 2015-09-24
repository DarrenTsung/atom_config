var path = require('path');
var fs = require("fs");
var Omni = require('../../omni-sharp-server/omni');
var _ = require('lodash');
var rx_1 = require("rx");
var atom_1 = require("atom");
function projectLock(solution, project, filePath) {
    var disposable = new rx_1.CompositeDisposable();
    var subject = new rx_1.Subject();
    var file = new atom_1.File(filePath), onDidChange = file.onDidChange(function () { return subject.onNext(filePath); }), onWillThrowWatchError = file.onWillThrowWatchError(function () {
        subject.onNext(filePath);
        disposable.remove(onDidChange);
        onDidChange.dispose();
        _.delay(function () {
            onDidChange = file.onDidChange(function () { return subject.onNext(filePath); });
            disposable.add(onDidChange);
        }, 5000);
    });
    disposable.add(onDidChange);
    disposable.add(onWillThrowWatchError);
    disposable.add(subject);
    return {
        observable: subject.throttle(30000).asObservable(),
        dispose: function () { return disposable.dispose(); }
    };
}
var FileMonitor = (function () {
    function FileMonitor() {
        this.filesMap = new WeakMap();
        this.required = false;
        this.title = 'Project Monitor';
        this.description = 'Monitors project.lock.json files for changes outside of atom, and keeps the running solution in sync';
    }
    FileMonitor.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var projectJsonEditors = Omni.configEditors
            .where(function (z) { return _.endsWith(z.getPath(), 'project.json'); })
            .flatMap(function (editor) {
            var s = new rx_1.Subject();
            editor.onDidSave(function () {
                s.onNext(false);
            });
            return s.asObservable();
        });
        var pauser = rx_1.Observable.merge(projectJsonEditors.throttle(10000), Omni.listener.packageRestoreFinished.debounce(1000).map(function (z) { return true; })).startWith(true);
        var changes = rx_1.Observable.merge(Omni.listener.model.projectAdded, Omni.listener.model.projectChanged)
            .map(function (project) { return ({ project: project, filePath: path.join(project.path, "project.lock.json") }); })
            .where(function (_a) {
            var project = _a.project, filePath = _a.filePath;
            return fs.existsSync(filePath);
        })
            .flatMap(function (_a) {
            var project = _a.project, filePath = _a.filePath;
            return Omni.getClientForProject(project).map(function (client) { return ({ client: client, project: project, filePath: filePath }); });
        })
            .flatMap(function (_a) {
            var client = _a.client, project = _a.project, filePath = _a.filePath;
            if (_this.filesMap.has(project)) {
                var v = _this.filesMap.get(project);
                v.dispose();
            }
            var lock = projectLock(client, project, filePath);
            _this.disposable.add(lock);
            _this.filesMap.set(project, lock);
            return lock.observable.map(function (path) { return ({ client: client, filePath: filePath }); });
        })
            .share()
            .pausable(pauser);
        this.disposable.add(changes
            .buffer(changes.throttle(1000), function () { return rx_1.Observable.timer(1000); })
            .subscribe(function (changes) {
            _.each(_.groupBy(changes, function (x) { return x.client.uniqueId; }), function (changes) {
                var client = changes[0].client;
                var paths = _.unique(changes.map(function (x) { return x.filePath; }));
                client.filesChanged(paths.map(function (z) { return ({ FileName: z }); }));
            });
        }));
        this.disposable.add(Omni.listener.model.projectRemoved
            .subscribe(function (project) {
            var removedItem = _this.filesMap.get(project);
            if (removedItem) {
                _this.filesMap.delete(project);
                removedItem.dispose();
            }
        }));
    };
    FileMonitor.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return FileMonitor;
})();
exports.fileMonitor = new FileMonitor;
