var rx_1 = require("rx");
var Omni = require("../../omni-sharp-server/omni");
var dock_1 = require("../atom/dock");
var omni_output_pane_view_1 = require('../views/omni-output-pane-view');
var ServerInformation = (function () {
    function ServerInformation() {
        this.required = true;
        this.title = 'Server Information';
        this.description = 'Monitors server output and status.';
    }
    ServerInformation.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var status = this.setupStatus();
        var output = this.setupOutput();
        var projects = this.setupProjects();
        this.disposable.add(Omni.activeModel.subscribe(function (z) { return _this.model = z; }));
        this.observe = { status: status, output: output, projects: projects, model: Omni.activeModel, updates: rx_1.Observable.ofObjectChanges(this) };
        this.disposable.add(dock_1.dock.addWindow('output', 'Omnisharp output', omni_output_pane_view_1.OutputWindow, {}));
    };
    ServerInformation.prototype.setupStatus = function () {
        // Stream the status from the active model
        return Omni.activeModel
            .flatMapLatest(function (model) { return model.observe.status; })
            .share();
    };
    ServerInformation.prototype.setupOutput = function () {
        // As the active model changes (when we go from an editor for ClientA to an editor for ClientB)
        // We want to make sure that the output field is
        return Omni.activeModel
            .flatMapLatest(function (z) { return z.observe.output; })
            .merge(Omni.activeModel.map(function (z) { return z.output; }))
            .startWith([])
            .share();
    };
    ServerInformation.prototype.setupProjects = function () {
        return Omni.activeModel
            .flatMapLatest(function (model) { return model.observe.projects; })
            .merge(Omni.activeModel.map(function (z) { return z.projects; }))
            .share();
    };
    ServerInformation.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return ServerInformation;
})();
exports.server = new ServerInformation;
