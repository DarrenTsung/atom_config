var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var PackageRestore = (function () {
    function PackageRestore() {
        this.required = true;
        this.title = 'Package Restore';
        this.description = 'Initializes a package restore, when an project.json file is saved.';
    }
    PackageRestore.prototype.activate = function () {
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.eachConfigEditor(function (editor, cd) {
            cd.add(editor.getBuffer().onDidSave(function () {
                Omni.request(function (client) { return client.filesChanged([{ FileName: editor.getPath() }]); });
            }));
        }));
    };
    PackageRestore.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return PackageRestore;
})();
exports.packageRestore = new PackageRestore;
