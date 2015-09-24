var Omni = require('../../lib/omni-sharp-server/omni');
var rx_1 = require("rx");
var test_helpers_1 = require("../test-helpers");
var code_format_1 = require("../../lib/omnisharp-atom/features/code-format");
describe('Code Format', function () {
    test_helpers_1.setupFeature(['features/code-format']);
    it('adds commands', function () {
        var disposable = new rx_1.CompositeDisposable();
        runs(function () {
            var commands = atom.commands;
            expect(commands.registeredCommands['omnisharp-atom:code-format']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:code-format-on-semicolon']).toBeTruthy();
            expect(commands.registeredCommands['omnisharp-atom:code-format-on-curly-brace']).toBeTruthy();
            disposable.dispose();
        });
    });
    it('formats code', function () {
        var d = test_helpers_1.restoreBuffers();
        var disposable = new rx_1.CompositeDisposable();
        disposable.add(d);
        var e;
        var request;
        var response;
        var responsePromise = Omni.listener.observeFormatRange
            .tapOnNext(function (r) { return request = r.request; })
            .tapOnNext(function (r) { return response = r.response; })
            .take(1)
            .toPromise();
        waitsForPromise(function () { return atom.workspace.open('simple/code-format/UnformattedClass.cs')
            .then(function (editor) {
            e = editor;
            code_format_1.codeFormat.format();
            var observable = Omni.listener.observeFormatRange
                .tapOnNext(function (r) {
                return request = r.request;
            })
                .take(1)
                .delay(400);
            return observable.toPromise();
        }); });
        runs(function () {
            expect(e.getPath()).toEqual(request.FileName);
            var expected = "public class UnformattedClass\n{\n    public const int TheAnswer = 42;\n}\n".replace(/\r|\n/g, '');
            var result = e.getText().replace(/\r|\n/g, '');
            expect(result).toContain(expected);
            disposable.dispose();
        });
    });
});
