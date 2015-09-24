var ClientManager = require('../lib/omni-sharp-server/client-manager');
var test_helpers_1 = require("./test-helpers");
var omnisharp_client_1 = require("omnisharp-client");
describe('OmniSharp Atom', function () {
    test_helpers_1.setupFeature([], false);
    it('Works with single cs files', function () {
        var c;
        waitsForPromise(function () {
            return test_helpers_1.openEditor('single-cs/class.cs').then(function (_a) {
                var client = _a.client;
                return c = client;
            });
        });
        runs(function () {
            expect(c.currentState).toBe(omnisharp_client_1.DriverState.Connected);
        });
    });
    it('shows a list of solutions when it detects many sln files', function () {
        var p;
        waitsForPromise(function () {
            return atom.workspace.open('two-solution/class.cs').then(function (editor) { p = ClientManager.getClientForEditor(editor).toPromise(); });
        });
        waitsFor(function () {
            var panels = atom.workspace.getModalPanels();
            return !!panels.length;
        });
        runs(function () {
            var panels = atom.workspace.getModalPanels();
            var panelItem = panels[0].item;
            expect(panelItem._items.length).toBe(2);
            panelItem.onConfirm(panelItem._items[0].name);
        });
        waitsForPromise(function () { return p; });
        runs(function () {
            expect(true).toBe(true);
        });
    });
});
