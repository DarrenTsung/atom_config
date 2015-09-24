var _ = require('./lodash');
var EventKit = require("event-kit");
var Generator;
var Yeoman = (function () {
    function Yeoman() {
    }
    Yeoman.prototype.activate = function (state) {
        var view;
        this.disposable = new EventKit.CompositeDisposable();
        this.disposable.add(atom.commands.add('atom-workspace', 'yo:yeoman', function () {
            if (!Generator)
                Generator = require("./generator");
            _.defer(function () { return new Generator().start(); });
        }));
    };
    Yeoman.prototype.deactivate = function () {
        this.disposable.dispose();
    };
    return Yeoman;
})();
var instance = new Yeoman;
module.exports = instance;
