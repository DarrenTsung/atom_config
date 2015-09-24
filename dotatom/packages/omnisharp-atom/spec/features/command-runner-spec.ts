import Client = require("../../lib/omni-sharp-server/client");
import Omni = require('../../lib/omni-sharp-server/omni');
import {Observable, CompositeDisposable} from "rx";
import {setupFeature, restoreBuffers, openEditor} from "../test-helpers";
var win32 = process.platform === "win32";
import {getDnxExe} from "../../lib/omnisharp-atom/features/command-runner";

describe('Command Runner', () => {
    setupFeature(['features/command-runner']);

    it('adds commands', () => {
        var disposable = new CompositeDisposable();
        waitsForPromise(() =>
            openEditor('commands/project.json'));
        waitsForPromise(() =>
            Observable.merge(Omni.clients.map(z => true), Omni.listener.model.projects.map(z => true)).debounce(10000).take(1).toPromise());

        runs(() => {
            var commands: any = atom.commands;

            expect(commands.registeredCommands['omnisharp-dnx:commands-[web]-(watch)']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-dnx:commands-[kestrel]-(watch)']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-dnx:commands-[run]']).toBeTruthy();
            disposable.dispose();
        });
    });

    it('returns the correct path for a given environment', () => {
        var result = getDnxExe(<any>{
            model: {
                runtimePath: 'abc'
            }
        });

        if (win32) {
            expect(result).toBe('abc/bin/dnx.exe');
        } else {
            expect(result).toBe('abc/bin/dnx');
        }
    });

    // TODO: Add Tests for the daemon
});
