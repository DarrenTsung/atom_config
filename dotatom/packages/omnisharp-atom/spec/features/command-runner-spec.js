var Omni = require('../../lib/omni-sharp-server/omni');
var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
var win32 = process.platform === "win32";
var command_runner_1 = require("../../lib/omnisharp-atom/features/command-runner");
describe('Command Runner', function () {
    test_helpers_1.setupFeature(['features/command-runner']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        waitsForPromise(function () {
            return test_helpers_1.openEditor('commands/project.json');
        });
        waitsForPromise(function () {
            return rx_1.Observable.merge(Omni.clients.map(function (z) { return true; }), Omni.listener.model.projects.map(function (z) { return true; })).debounce(10000).take(1).toPromise();
        });
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-dnx:commands-[web]-(watch)']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-dnx:commands-[kestrel]-(watch)']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-dnx:commands-[run]']).toBeTruthy();
            disposable.dispose();
        });
    });
    it('returns the correct path for a given environment', function () {
        var result = command_runner_1.getDnxExe({
            model: {
                runtimePath: 'abc'
            }
        });
        if (win32) {
            expect(result).toBe('abc/bin/dnx.exe');
        }
        else {
            expect(result).toBe('abc/bin/dnx');
        }
    });
    // TODO: Add Tests for the daemon
});
