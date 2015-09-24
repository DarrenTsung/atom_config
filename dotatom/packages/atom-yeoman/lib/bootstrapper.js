var generatorService;
var atomYeoman;
var Bootstrapper = (function () {
    function Bootstrapper() {
        this.config = {};
    }
    Bootstrapper.prototype.activate = function (state) {
        if (!atomYeoman)
            atomYeoman = require('./atom-yeoman');
        atomYeoman.activate(state);
    };
    Bootstrapper.prototype.generatorServiceV1 = function () {
        if (!generatorService)
            generatorService = require("./generator-service");
        return new generatorService();
    };
    Bootstrapper.prototype.deactivate = function () {
        atomYeoman.deactivate();
    };
    return Bootstrapper;
})();
var instance = new Bootstrapper;
module.exports = instance;
