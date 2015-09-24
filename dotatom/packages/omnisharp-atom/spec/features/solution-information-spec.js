var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Solution Information', function () {
    test_helpers_1.setupFeature(['features/solution-information']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:next-solution-status']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:solution-status']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:previous-solution-status']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:stop-server']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:start-server']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:restart-server']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
