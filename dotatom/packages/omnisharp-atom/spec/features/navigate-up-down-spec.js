var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Navigation', function () {
    test_helpers_1.setupFeature(['features/navigate-up-down']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:navigate-up']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:navigate-down']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
