var ClientManager = require('../lib/omni-sharp-server/client-manager');
var rx_1 = require("rx");
var omnisharp_client_1 = require("omnisharp-client");
if (jasmine.getEnv().defaultTimeoutInterval < 30000)
    jasmine.getEnv().defaultTimeoutInterval = 30000;
if (jasmine.getEnv().defaultTimeoutInterval === 60000)
    jasmine.getEnv().defaultTimeoutInterval = 60000 * 3;
ClientManager.observationClient.errors.subscribe(function (error) { return console.error(JSON.stringify(error)); });
ClientManager.observationClient.events.subscribe(function (event) { return console.info("server event: " + JSON.stringify(event)); });
ClientManager.observationClient.requests.subscribe(function (r) { return console.info("request: " + JSON.stringify(r)); });
ClientManager.observationClient.responses.subscribe(function (r) { return console.info("response: " + JSON.stringify(r)); });
function setupFeature(features, unitTestMode) {
    if (unitTestMode === void 0) { unitTestMode = true; }
    var cd;
    beforeEach(function () {
        cd = new rx_1.CompositeDisposable();
        ClientManager._unitTestMode_ = unitTestMode;
        atom.config.set('omnisharp-atom:feature-white-list', true);
        atom.config.set('omnisharp-atom:feature-list', features);
        waitsForPromise(function () { return atom.packages.activatePackage('language-csharp')
            .then(function () { return atom.packages.activatePackage('omnisharp-atom'); })
            .then(function (pack) { return pack.mainModule._started.toPromise(); }); });
    });
    afterEach(function () {
        atom.config.set('omnisharp-atom:feature-white-list', undefined);
        atom.config.set('omnisharp-atom:feature-list', undefined);
        cd.dispose();
    });
}
exports.setupFeature = setupFeature;
function restoreBuffers() {
    var disposable = new rx_1.CompositeDisposable();
    var buffers = new Map();
    if (ClientManager._unitTestMode_) {
        disposable.add(ClientManager.observationClient.responses
            .where(function (z) {
            return z.request.FileName && z.request.Buffer;
        })
            .map(function (z) {
            return ({ fileName: z.request.FileName, buffer: z.request.Buffer });
        })
            .where(function (_a) {
            var fileName = _a.fileName;
            return !buffers.has(fileName);
        })
            .subscribe(function (_a) {
            var fileName = _a.fileName, buffer = _a.buffer;
            buffers.set(fileName, buffer);
        }));
    }
    return rx_1.Disposable.create(function () {
        disposable.dispose();
        // Reset the buffers to their original state
        if (ClientManager._unitTestMode_) {
            var results = [];
            var iterator = buffers.entries();
            var iteratee = iterator.next();
            while (!iteratee.done) {
                var _a = iteratee.value, path = _a[0], buffer = _a[1];
                results.push(ClientManager.getClientForPath(path)
                    .map(function (z) { return z.updatebuffer({
                    Line: 0,
                    Column: 0,
                    Buffer: buffer,
                    FileName: path
                }); }));
                iteratee = iterator.next();
            }
        }
    });
}
exports.restoreBuffers = restoreBuffers;
function openEditor(file) {
    return rx_1.Observable.fromPromise(atom.workspace.open(file))
        .flatMap(function (editor) {
        return ClientManager.getClientForEditor(editor).map(function (client) { return ({
            editor: editor,
            client: client
        }); });
    })
        .flatMap(function (_a) {
        var editor = _a.editor, client = _a.client;
        return client.state.startWith(client.currentState).map(function (state) { return ({ editor: editor, client: client, state: state }); });
    })
        .where(function (z) { return z.state === omnisharp_client_1.DriverState.Connected; })
        .take(1)
        .toPromise();
}
exports.openEditor = openEditor;
