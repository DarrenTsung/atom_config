var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Find Symbols', function () {
    test_helpers_1.setupFeature(['features/find-symbols']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:find-symbols']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
