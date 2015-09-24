var _ = require('./lodash');
var Generator;
var GeneratorService = (function () {
    function GeneratorService() {
    }
    GeneratorService.prototype.start = function (prefix, cwd, options) {
        if (!Generator)
            Generator = require('./generator');
        return new Promise(function (resolve) {
            _.defer(function () { return new Generator(prefix, cwd, options).start().then(resolve); });
        });
    };
    GeneratorService.prototype.run = function (generator, cwd, options) {
        if (!Generator)
            Generator = require('./generator');
        return new Promise(function (resolve) {
            _.defer(function () { return new Generator(undefined, undefined, options).run(generator, cwd).then(resolve); });
        });
    };
    GeneratorService.prototype.list = function (prefix, cwd, options) {
        if (!Generator)
            Generator = require('./generator');
        return new Promise(function (resolve) {
            _.defer(function () { return new Generator(prefix, cwd, options).listGenerators(cwd).then(resolve); });
        });
    };
    return GeneratorService;
})();
module.exports = GeneratorService;
