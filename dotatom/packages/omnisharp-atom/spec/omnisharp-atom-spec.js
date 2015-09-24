var ClientManager = require('../lib/omni-sharp-server/client-manager');
var omnisharp_client_1 = require("omnisharp-client");
var rx_1 = require("rx");
var test_helpers_1 = require("./test-helpers");
describe('OmniSharp Atom', function () {
    test_helpers_1.setupFeature([], false);
    describe('when the package is activated', function () {
        it('connect', function () {
            waitsForPromise(function () {
                return rx_1.Observable.fromPromise(atom.workspace.open('simple/project.json'))
                    .flatMap(function (editor) {
                    return ClientManager.getClientForEditor(editor);
                })
                    .flatMap(function (x) {
                    return x.state.startWith(x.currentState);
                })
                    .where(function (z) {
                    return z === omnisharp_client_1.DriverState.Connected;
                })
                    .take(1)
                    .toPromise();
            });
            runs(function () {
                expect(ClientManager.connected).toBeTruthy();
            });
        });
        it('connect-simple2', function () {
            waitsForPromise(function () {
                return rx_1.Observable.fromPromise(Promise.all([
                    atom.workspace.open('simple/project.json'),
                    atom.workspace.open('simple2/project.json')
                ]))
                    .flatMap(function (x) { return rx_1.Observable.from(x); })
                    .flatMap(function (editor) {
                    return ClientManager.getClientForEditor(editor);
                })
                    .flatMap(function (x) {
                    return x.state.startWith(x.currentState);
                })
                    .where(function (z) {
                    return z === omnisharp_client_1.DriverState.Connected;
                })
                    .take(2)
                    .toPromise();
            });
            runs(function () {
                expect(ClientManager.connected).toBeTruthy();
                expect(ClientManager.activeClients.length).toBe(2);
            });
        });
    });
});
