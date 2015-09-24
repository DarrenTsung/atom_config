var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Intellisense', function () {
    test_helpers_1.setupFeature(['features/intellisense']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:intellisense-dot']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:intellisense-space']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:intellisense-semicolon']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
