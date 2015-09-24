var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Go To Definition', function () {
    test_helpers_1.setupFeature(['features/go-to-definition']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:go-to-definition']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
