var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var Navigate = (function () {
    function Navigate() {
        this.required = true;
        this.title = 'Navigate';
        this.description = 'Adds server based navigation support';
    }
    Navigate.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:navigate-up", function () {
            return _this.navigateUp();
        }));
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:navigate-down", function () {
            return _this.navigateDown();
        }));
        this.disposable.add(Omni.listener.observeNavigateup.subscribe(function (data) { return _this.navigateTo(data.response); }));
        this.disposable.add(Omni.listener.observeNavigatedown.subscribe(function (data) { return _this.navigateTo(data.response); }));
    };
    Navigate.prototype.dispose = function () {
        this.disposable.dispose();
    };
    Navigate.prototype.navigateUp = function () {
        Omni.request(function (client) { return client.navigateup({}); });
    };
    Navigate.prototype.navigateDown = function () {
        Omni.request(function (client) { return client.navigatedown({}); });
    };
    Navigate.prototype.navigateTo = function (data) {
        var editor = atom.workspace.getActiveTextEditor();
        Omni.navigateTo({ FileName: editor.getURI(), Line: data.Line, Column: data.Column });
    };
    return Navigate;
})();
exports.navigate = new Navigate;
