var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
var a = require("atom");
var Range = a.Range;
describe('Rename', function () {
    test_helpers_1.setupFeature(['features/rename']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:rename']).toBeTruthy();
            disposable.dispose();
        });
    });
    it('should select rename text appropriately with selection', function () {
        waitsForPromise(function () { return test_helpers_1.openEditor('simple/rename/ClassToRename.cs')
            .then(function (_a) {
            var editor = _a.editor;
            editor.setSelectedBufferRange(new Range([4, 16], [4, 22]));
            atom.commands.dispatch(atom.views.getView(editor), 'omnisharp-atom:rename');
        }); });
        waitsFor(function () {
            var panels = atom.workspace.getTopPanels();
            return !!panels.length;
        });
        runs(function () {
            var panels = atom.workspace.getTopPanels();
            var panel = panels[0].item;
            expect(panel.miniEditor.getText()).toEqual('Method');
        });
    });
    it('should select rename text appropriately with cursor', function () {
        waitsForPromise(function () { return test_helpers_1.openEditor('simple/rename/ClassToRename.cs')
            .then(function (_a) {
            var editor = _a.editor;
            editor.setCursorBufferPosition([4, 18]);
            atom.commands.dispatch(atom.views.getView(editor), 'omnisharp-atom:rename');
        }); });
        waitsFor(function () {
            var panels = atom.workspace.getTopPanels();
            return !!panels.length;
        });
        runs(function () {
            var panels = atom.workspace.getTopPanels();
            var panel = panels[0].item;
            expect(panel.miniEditor.getText()).toEqual('Method');
        });
    });
});
