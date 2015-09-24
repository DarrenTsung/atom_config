var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Find Usages', function () {
    test_helpers_1.setupFeature(['features/find-usages']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:find-usages']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:go-to-implementation']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:next-usage']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:go-to-usage']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:previous-usage']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:go-to-next-usage']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:go-to-previous-usage']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
