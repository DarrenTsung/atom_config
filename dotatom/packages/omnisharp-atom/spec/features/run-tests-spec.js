var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
describe('Run Tests', function () {
    test_helpers_1.setupFeature(['features/run-tests']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:run-all-tests']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:run-fixture-tests']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:run-single-test']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:run-last-test']).toBeTruthy();
            disposable.dispose();
        });
    });
    // TODO: Test functionality
});
