var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var rx_1 = require('rx');
var omnisharp_client_1 = require("omnisharp-client");
var view_model_1 = require("./view-model");
var Client = (function (_super) {
    __extends(Client, _super);
    function Client(options) {
        _super.call(this, options);
        this.temporary = false;
        this._clientDisposable = new rx_1.CompositeDisposable();
        this.configureClient();
        this.temporary = options.temporary;
        this.model = new view_model_1.ViewModel(this);
        this.path = options.projectPath;
        this.index = options['index'];
        this.repository = options.repository;
        this.setupRepository();
        this._clientDisposable.add(this.model);
    }
    Client.prototype.toggle = function () {
        if (this.currentState === omnisharp_client_1.DriverState.Disconnected) {
            var path = atom && atom.project && atom.project.getPaths()[0];
            this.connect({
                projectPath: path
            });
        }
        else {
            this.disconnect();
        }
    };
    Client.prototype.connect = function (options) {
        if (this.currentState === omnisharp_client_1.DriverState.Connected || this.currentState === omnisharp_client_1.DriverState.Connecting)
            return;
        _super.prototype.connect.call(this, options);
        this.log("Starting OmniSharp server (pid:" + this.id + ")");
        this.log("OmniSharp Location: " + this.serverPath);
        this.log("Change the location that OmniSharp is loaded from by setting the OMNISHARP environment variable");
        this.log("OmniSharp Path: " + this.projectPath);
    };
    Client.prototype.disconnect = function () {
        _super.prototype.disconnect.call(this);
        this.log("Omnisharp server stopped.");
    };
    Client.prototype.dispose = function () {
        _super.prototype.dispose.call(this);
        this._clientDisposable.dispose();
    };
    Client.prototype.configureClient = function () {
        this.logs = this.events.map(function (event) { return ({
            message: event.Body && event.Body.Message || event.Event || '',
            logLevel: event.Body && event.Body.LogLevel || (event.Type === "error" && 'ERROR') || 'INFORMATION'
        }); });
        this._clientDisposable.add(this.errors.subscribe(function (exception) {
            console.error(exception);
        }));
        this._clientDisposable.add(this.responses.subscribe(function (data) {
            if (atom.config.get('omnisharp-atom.developerMode')) {
                console.log("omni:" + data.command, data.request, data.response);
            }
        }));
    };
    Client.prototype.withEditor = function (editor) {
        this._currentEditor = editor;
        return this;
    };
    Client.prototype._fixupRequest = function (action, request, cb) {
        // Only send changes for requests that really need them.
        if (this._currentEditor && _.isObject(request)) {
            var editor = this._currentEditor;
            var marker = editor.getCursorBufferPosition();
            _.defaults(request, { Column: marker.column, Line: marker.row, FileName: editor.getURI(), Buffer: editor.getBuffer().getLines().join('\n') });
        }
        if (request['Buffer']) {
            request['Buffer'] = request['Buffer'].replace(Client._regex, '');
        }
        return cb();
    };
    Client.prototype.request = function (action, request, options) {
        if (this._currentEditor) {
            var editor = this._currentEditor;
            this._currentEditor = null;
            // TODO: update and add to typings.
            if (editor.isDestroyed()) {
                return rx_1.Observable.empty();
            }
        }
        var tempR = request;
        if (tempR && _.endsWith(tempR.FileName, '.json')) {
            tempR.Buffer = null;
            tempR.Changes = null;
        }
        return _super.prototype.request.call(this, action, request, options);
    };
    Client.prototype.setupRepository = function () {
        var _this = this;
        if (this.repository) {
            var branchSubject = new rx_1.Subject();
            this._clientDisposable.add(branchSubject
                .distinctUntilChanged()
                .subscribe(function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:restart-server'); }));
            this._clientDisposable.add(branchSubject);
            this._clientDisposable.add(this.repository.onDidChangeStatuses(function () {
                branchSubject.onNext(_this.repository['branch']);
            }));
        }
    };
    Client.prototype.whenConnected = function () {
        return this.state.startWith(this.currentState)
            .where(function (x) { return x === omnisharp_client_1.DriverState.Connected; })
            .take(1);
    };
    Client._regex = new RegExp(String.fromCharCode(0xFFFD), 'g');
    return Client;
})(omnisharp_client_1.OmnisharpClientV2);
for (var key in Client.prototype) {
    if (_.endsWith(key, 'Promise')) {
        (function () {
            var action = key.replace(/Promise$/, '');
            var promiseMethod = Client.prototype[key];
            var observableMethod = Client.prototype[action];
            Client.prototype[key] = function (request, options) {
                var _this = this;
                return this._fixupRequest(action, request, function () { return promiseMethod.call(_this, request, options); });
            };
            Client.prototype[action] = function (request, options) {
                var _this = this;
                return this._fixupRequest(action, request, function () { return observableMethod.call(_this, request, options); });
            };
        })();
    }
}
module.exports = Client;
