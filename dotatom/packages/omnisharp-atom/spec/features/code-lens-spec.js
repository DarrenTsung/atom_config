var Omni = require('../../lib/omni-sharp-server/omni');
var test_helpers_1 = require("../test-helpers");
var code_lens_1 = require("../../lib/omnisharp-atom/features/code-lens");
describe('Code Lens', function () {
    test_helpers_1.setupFeature(['features/code-lens']);
    code_lens_1.Lens.prototype._isVisible = function () { return true; };
    var e;
    it('should add code lens\'', function () {
        var p1 = test_helpers_1.openEditor('simple/code-lens/CodeLens.cs')
            .then(function (a) {
            e = a.editor;
            return a;
        });
        var p2 = Omni.listener.observeCurrentfilemembersasflat.debounce(1000).take(1).toPromise();
        waitsForPromise(function () { return Promise.all([p1, p2]); });
        runs(function () {
            var map = code_lens_1.codeLens.decorations;
            var lenses = map.get(e);
            expect(lenses.size).toBe(15);
            //expect(_.filter(lenses, x => x.loaded).length).toBe(9);
        });
    });
    it('should handle editor switching', function () {
        var p1 = test_helpers_1.openEditor('simple/code-lens/CodeLens.cs')
            .then(function () { return Omni.listener.observeCurrentfilemembersasflat.debounce(1000).take(1).toPromise(); })
            .then(function () { return test_helpers_1.openEditor('simple/code-lens/CodeLens2.cs'); })
            .then(function () { return Omni.listener.observeCurrentfilemembersasflat.debounce(1000).take(1).toPromise(); })
            .then(function () { return test_helpers_1.openEditor('simple/code-lens/CodeLens.cs'); })
            .then(function (a) {
            e = a.editor;
            return a;
        })
            .then(function () { return Omni.listener.observeCurrentfilemembersasflat.debounce(1000).take(1).toPromise(); });
        waitsForPromise(function () { return p1; });
        runs(function () {
            // Sometimes varies as the server starts up
            expect(e.getDecorations().length).toBeGreaterThan(9);
        });
    });
});
