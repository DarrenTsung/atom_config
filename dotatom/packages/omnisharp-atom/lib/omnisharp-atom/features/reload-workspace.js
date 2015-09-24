var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var fs_1 = require("fs");
var oexists = rx_1.Observable.fromCallback(fs_1.exists);
var ReloadWorkspace = (function () {
    function ReloadWorkspace() {
        this.required = true;
        this.title = 'Reload Workspace';
        this.description = 'Reloads the workspace, to make sure all the files are in sync.';
    }
    ReloadWorkspace.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(atom.commands.add(atom.views.getView(atom.workspace), 'omnisharp-atom:reload-workspace', function () { return _this.reloadWorkspace().toPromise(); }));
    };
    ReloadWorkspace.prototype.reloadWorkspace = function () {
        return Omni.clients
            .flatMap(function (client) {
            return rx_1.Observable.from(client.model.projects)
                .flatMap(function (x) { return x.sourceFiles; })
                .observeOn(rx_1.Scheduler.timeout)
                .concatMap(function (file) { return oexists(file).where(function (x) { return !x; })
                .flatMap(function () { return client.updatebuffer({ FileName: file, Buffer: '' }); }); });
        });
    };
    ReloadWorkspace.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return ReloadWorkspace;
})();
exports.reloadWorkspace = new ReloadWorkspace;
