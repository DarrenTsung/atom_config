var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var FindSymbolsView = require('../views/find-symbols-view');
var FindSymbols = (function () {
    function FindSymbols() {
        this.required = true;
        this.title = 'Find Symbols';
        this.description = 'Adds commands to find symbols through the UI.';
    }
    FindSymbols.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:find-symbols', function () {
            _this.view = new FindSymbolsView();
        }));
        this.disposable.add(Omni.listener.observeFindsymbols.subscribe(function (data) {
            _this.view.addToList(data.response.QuickFixes);
        }));
    };
    FindSymbols.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return FindSymbols;
})();
exports.findSymbols = new FindSymbols;
