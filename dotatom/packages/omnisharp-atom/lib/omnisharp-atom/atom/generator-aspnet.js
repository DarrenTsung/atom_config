var rx_1 = require("rx");
var lodash_1 = require("lodash");
var fs = require("fs");
var path = require("path");
var solution_information_1 = require("../features/solution-information");
var readdir = rx_1.Observable.fromNodeCallback(fs.readdir);
var stat = rx_1.Observable.fromNodeCallback(fs.stat);
// TODO: Make sure it stays in sync with
var commands = [
    'AngularController',
    'AngularControllerAs',
    'AngularDirective',
    'AngularFactory',
    'AngularModule',
    'BowerJson',
    'Class',
    'CoffeeScript',
    'Config',
    'gitignore',
    'Gruntfile',
    'Gulpfile',
    'HTMLPage',
    'Interface',
    'JavaScript',
    'JScript',
    'JSON',
    'JSONSchema',
    'JSX',
    'Middleware',
    'MvcController',
    'MvcView',
    'PackageJson',
    'StartupClass',
    'StyleSheet',
    'StyleSheetLess',
    'StyleSheetSCSS',
    'TagHelper',
    'TextFile',
    'TypeScript',
    'TypeScriptConfig',
    'WebApiController'
];
var GeneratorAspnet = (function () {
    function GeneratorAspnet() {
        this.required = true;
        this.title = 'Aspnet Yeoman Generator';
        this.description = 'Enables the aspnet yeoman generator.';
    }
    GeneratorAspnet.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:new-project', function () {
            return _this.run("aspnet:app --useCurrentDirectory")
                .then(function (messages) {
                var allMessages = messages.skip
                    .concat(messages.create)
                    .concat(messages.identical)
                    .concat(messages.force);
                return rx_1.Observable.from(['Startup.cs', 'Program.cs', '.cs'])
                    .concatMap(function (file) {
                    return lodash_1.filter(allMessages, function (message) { return lodash_1.endsWith(message, file); });
                })
                    .take(1)
                    .map(function (file) { return path.join(messages.cwd, file); })
                    .toPromise();
            })
                .then(function (file) {
                if (solution_information_1.solutionInformation.solutions.length) {
                    atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:restart-server');
                }
                atom.workspace.open(file);
            });
        }));
        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:new-class', function () { return _this.run("aspnet:Class"); }));
        lodash_1.each(commands, function (command) {
            _this.disposable.add(atom.commands.add('atom-workspace', "omnisharp-atom:aspnet-" + command, function () { return _this.run("aspnet:" + command); }));
        });
    };
    GeneratorAspnet.prototype.run = function (command) {
        return this.generator.run(command, undefined, { promptOnZeroDirectories: true });
    };
    GeneratorAspnet.prototype.setup = function (generator) {
        this.generator = generator;
    };
    GeneratorAspnet.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return GeneratorAspnet;
})();
exports.generatorAspnet = new GeneratorAspnet;
