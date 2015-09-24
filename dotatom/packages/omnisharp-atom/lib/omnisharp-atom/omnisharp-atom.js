require('./configure-rx');
var _ = require('lodash');
var rx_1 = require("rx");
var path = require('path');
var fs = require('fs');
// TODO: Remove these at some point to stream line startup.
var Omni = require('../omni-sharp-server/omni');
var world_1 = require('./world');
var win32 = process.platform === "win32";
var OmniSharpAtom = (function () {
    function OmniSharpAtom() {
        this.restartLinter = function () { };
        this.config = {
            autoStartOnCompatibleFile: {
                title: "Autostart Omnisharp Roslyn",
                description: "Automatically starts Omnisharp Roslyn when a compatible file is opened.",
                type: 'boolean',
                default: true
            },
            developerMode: {
                title: 'Developer Mode',
                description: 'Outputs detailed server calls in console.log',
                type: 'boolean',
                default: false
            },
            showDiagnosticsForAllSolutions: {
                title: 'Show Diagnostics for all Solutions',
                description: 'Advanced: This will show diagnostics for all open solutions.  NOTE: May take a restart or change to each server to take effect when turned on.',
                type: 'boolean',
                default: false
            },
            enableAdvancedFileNew: {
                title: 'Enable `Advanced File New`',
                description: 'Enable `Advanced File New` when doing ctrl-n/cmd-n within a C# editor.',
                type: 'boolean',
                default: true
            },
            useAdvancedFileNew: {
                title: 'Use `Advanced File New` as default',
                description: 'Use `Advanced File New` as your default new command everywhere.',
                type: 'boolean',
                default: false
            },
            useLeftLabelColumnForSuggestions: {
                title: 'Use Left-Label column in Suggestions',
                description: 'Shows return types in a right-aligned column to the left of the completion suggestion text.',
                type: 'boolean',
                default: false
            },
            useIcons: {
                title: 'Use unique icons for kind indicators in Suggestions',
                description: 'Shows kinds with unique icons rather than autocomplete default styles.',
                type: 'boolean',
                default: true
            },
            autoAdjustTreeView: {
                title: 'Adjust the tree view to match the solution root.',
                descrption: 'This will automatically adjust the treeview to be the root of the solution.',
                type: 'boolean',
                default: false
            },
            nagAdjustTreeView: {
                title: 'Show the notifications to Adjust the tree view',
                type: 'boolean',
                default: true
            },
            autoAddExternalProjects: {
                title: 'Add external projects to the tree view.',
                descrption: 'This will automatically add external sources to the tree view.\n External sources are any projects that are loaded outside of the solution root.',
                type: 'boolean',
                default: false
            },
            nagAddExternalProjects: {
                title: 'Show the notifications to add or remove external projects',
                type: 'boolean',
                default: true
            },
            hideLinterInterface: {
                title: 'Hide the linter interface when using omnisharp-atom editors',
                type: 'boolean',
                default: true
            },
            wantMetadata: {
                title: 'Want metadata',
                descrption: 'Request symbol metadata from the server, when using go-to-definition.  This is disabled by default on Linux, due to issues with Roslyn on Mono.',
                type: 'boolean',
                default: win32
            }
        };
    }
    OmniSharpAtom.prototype.activate = function (state) {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable;
        this._started = new rx_1.AsyncSubject();
        this._activated = new rx_1.AsyncSubject();
        this.configureKeybindings();
        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:toggle', function () { return _this.toggle(); }));
        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:settings', function () { return atom.workspace.open('atom://config/packages/omnisharp-atom')
            .then(function (tab) {
            if (tab && tab.getURI && tab.getURI() !== 'atom://config/packages/omnisharp-atom') {
                atom.workspace.open('atom://config/packages/omnisharp-atom');
            }
        }); }));
        var whiteList = atom.config.get("omnisharp-atom:feature-white-list");
        var featureList = atom.config.get('omnisharp-atom:feature-list');
        var whiteListUndefined = (typeof whiteList === 'undefined');
        var started = rx_1.Observable.concat(// Concat is important here, atom features need to be bootstrapped first.
        this.getFeatures(featureList, whiteList, "atom"), this.getFeatures(featureList, whiteList, "features")).filter(function (l) {
            if (typeof whiteList === 'undefined') {
                return true;
            }
            if (whiteList) {
                return _.contains(featureList, l.file);
            }
            else {
                return !_.contains(featureList, l.file);
            }
        })
            .concatMap(function (z) { return z.load(); })
            .toArray()
            .share();
        require('atom-package-deps').install('omnisharp-atom')
            .then(function () { return started.toPromise(); })
            .then(function () {
            _this._started.onNext(true);
            _this._started.onCompleted();
        });
        this.disposable.add(started.subscribe(function (features) {
            console.info("Activating omnisharp-atom...");
            atom.config.setSchema('omnisharp-atom', {
                type: 'object',
                properties: _this.config
            });
            Omni.activate();
            _this.disposable.add(Omni);
            world_1.world.activate();
            _this.disposable.add(world_1.world);
            var deferred = [];
            _.each(features, function (f) {
                var key = f.key, value = f.value;
                // Whitelist is used for unit testing, we don't want the config to make changes here
                if (whiteListUndefined && _.has(_this.config, key)) {
                    var configKey = "omnisharp-atom." + key;
                    var enableDisposable, disableDisposable;
                    _this.disposable.add(atom.config.observe(configKey, function (enabled) {
                        if (!enabled) {
                            if (disableDisposable) {
                                disableDisposable.dispose();
                                _this.disposable.remove(disableDisposable);
                                disableDisposable = null;
                            }
                            try {
                                value.dispose();
                            }
                            catch (ex) { }
                            enableDisposable = atom.commands.add('atom-workspace', "omnisharp-atom:enable-" + _.kebabCase(key), function () { return atom.config.set(configKey, true); });
                            _this.disposable.add(enableDisposable);
                        }
                        else {
                            if (enableDisposable) {
                                enableDisposable.dispose();
                                _this.disposable.remove(disableDisposable);
                                enableDisposable = null;
                            }
                            value.activate();
                            if (_.isFunction(value['attach'])) {
                                if (deferred)
                                    deferred.push(function () { return value['attach'](); });
                                else
                                    value['attach']();
                            }
                            disableDisposable = atom.commands.add('atom-workspace', "omnisharp-atom:disable-" + _.kebabCase(key), function () { return atom.config.set(configKey, false); });
                            _this.disposable.add(disableDisposable);
                        }
                    }));
                    _this.disposable.add(atom.commands.add('atom-workspace', "omnisharp-atom:toggle-" + _.kebabCase(key), function () { return atom.config.set(configKey, !atom.config.get(configKey)); }));
                }
                else {
                    value.activate();
                    if (_.isFunction(value['attach'])) {
                        deferred.push(function () { return value['attach'](); });
                    }
                }
                _this.disposable.add(rx_1.Disposable.create(function () { try {
                    value.dispose();
                }
                catch (ex) { } }));
            });
            _.each(deferred, function (x) { return x(); });
            deferred = null;
            _this.disposable.add(atom.workspace.observeTextEditors(function (editor) {
                _this.detectAutoToggleGrammar(editor);
            }));
            _this._activated.onNext(true);
            _this._activated.onCompleted();
        }));
    };
    OmniSharpAtom.prototype.getPackageDir = function () {
        if (!this._packageDir) {
            console.info("getPackageDirPaths: " + atom.packages.getPackageDirPaths());
            this._packageDir = _.find(atom.packages.getPackageDirPaths(), function (packagePath) {
                console.info("packagePath " + packagePath + " exists: " + fs.existsSync(path.join(packagePath, "omnisharp-atom")));
                return fs.existsSync(path.join(packagePath, "omnisharp-atom"));
            });
            // Fallback, this is for unit testing on travis mainly
            if (!this._packageDir) {
                this._packageDir = path.resolve(__dirname, '../../..');
            }
        }
        return this._packageDir;
    };
    OmniSharpAtom.prototype.getFeatures = function (featureList, whiteList, folder) {
        var _this = this;
        console.info("Getting features for '" + folder + "'...");
        var packageDir = this.getPackageDir();
        var featureDir = packageDir + "/omnisharp-atom/lib/omnisharp-atom/" + folder;
        function loadFeature(file) {
            var result = require("./" + folder + "/" + file);
            console.info("Loading feature '" + folder + "/" + file + "'...");
            return result; //_.values(result).filter(feature => !_.isFunction(feature));
        }
        return rx_1.Observable.fromNodeCallback(fs.readdir)(featureDir)
            .flatMap(function (files) { return rx_1.Observable.from(files); })
            .where(function (file) { return /\.js$/.test(file); })
            .flatMap(function (file) { return rx_1.Observable.fromNodeCallback(fs.stat)(featureDir + "/" + file).map(function (stat) { return ({ file: file, stat: stat }); }); })
            .where(function (z) { return !z.stat.isDirectory(); })
            .map(function (z) { return ({
            file: (folder + "/" + path.basename(z.file)).replace(/\.js$/, ''),
            load: function () {
                var feature = loadFeature(z.file);
                var features = [];
                _.each(feature, function (value, key) {
                    if (!_.isFunction(value)) {
                        if (!value.required) {
                            _this.config[key] = {
                                title: "" + value.title,
                                description: value.description,
                                type: 'boolean',
                                default: (_.has(value, 'default') ? value.default : true)
                            };
                        }
                        features.push({ key: key, value: value });
                    }
                });
                return rx_1.Observable.from(features);
            }
        }); });
    };
    OmniSharpAtom.prototype.detectAutoToggleGrammar = function (editor) {
        var _this = this;
        var grammar = editor.getGrammar();
        this.detectGrammar(editor, grammar);
        this.disposable.add(editor.onDidChangeGrammar(function (grammar) { return _this.detectGrammar(editor, grammar); }));
    };
    OmniSharpAtom.prototype.detectGrammar = function (editor, grammar) {
        if (!atom.config.get('omnisharp-atom.autoStartOnCompatibleFile')) {
            return; //short out, if setting to not auto start is enabled
        }
        if (Omni.isOn && !this.menu) {
            this.toggleMenu();
        }
        if (grammar.name === 'C#') {
            if (Omni.isOff) {
                this.toggle();
            }
        }
        else if (grammar.name === "JSON") {
            if (path.basename(editor.getPath()) === "project.json") {
                if (Omni.isOff) {
                    this.toggle();
                }
            }
        }
        else if (grammar.name === "C# Script File") {
            if (Omni.isOff) {
                this.toggle();
            }
        }
    };
    OmniSharpAtom.prototype.toggleMenu = function () {
        var menuJsonFile = this.getPackageDir() + "/omnisharp-atom/menus/omnisharp-menu.json";
        var menuJson = JSON.parse(fs.readFileSync(menuJsonFile, 'utf8'));
        this.menu = atom.menu.add(menuJson.menu);
        this.disposable.add(this.menu);
    };
    OmniSharpAtom.prototype.toggle = function () {
        if (Omni.isOff) {
            Omni.connect();
            this.toggleMenu();
        }
        else if (Omni.isOn) {
            Omni.disconnect();
            if (this.menu) {
                this.disposable.remove(this.menu);
                this.menu.dispose();
                this.menu = null;
            }
        }
    };
    OmniSharpAtom.prototype.deactivate = function () {
        this.disposable.dispose();
    };
    OmniSharpAtom.prototype.consumeStatusBar = function (statusBar) {
        var f = require('./atom/status-bar');
        f.statusBar.setup(statusBar);
        var f = require('./atom/framework-selector');
        f.frameworkSelector.setup(statusBar);
        var f = require('./atom/feature-buttons');
        f.featureEditorButtons.setup(statusBar);
    };
    OmniSharpAtom.prototype.consumeYeomanEnvironment = function (generatorService) {
        var generatorAspnet = require("./atom/generator-aspnet").generatorAspnet;
        generatorAspnet.setup(generatorService);
    };
    OmniSharpAtom.prototype.provideAutocomplete = function () {
        var CompletionProvider = require("./services/completion-provider").CompletionProvider;
        this.disposable.add(CompletionProvider);
        return CompletionProvider;
    };
    OmniSharpAtom.prototype.provideLinter = function () {
        var LinterProvider = require("./services/linter-provider");
        return LinterProvider.provider;
    };
    OmniSharpAtom.prototype.provideProjectJson = function () {
        return require("./services/project-provider").concat(require('./services/framework-provider'));
    };
    OmniSharpAtom.prototype.consumeLinter = function (linter) {
        var LinterProvider = require("./services/linter-provider");
        var linters = LinterProvider;
        this.disposable.add(rx_1.Disposable.create(function () {
            _.each(linters, function (l) {
                linter.deleteLinter(l);
            });
        }));
        this.disposable.add(LinterProvider.init());
    };
    OmniSharpAtom.prototype.configureKeybindings = function () {
        var omnisharpFileNew = this.getPackageDir() + "/omnisharp-atom/keymaps/omnisharp-file-new.cson";
        this.disposable.add(atom.config.observe("omnisharp-atom.enableAdvancedFileNew", function (enabled) {
            if (enabled) {
                atom.keymaps.loadKeymap(omnisharpFileNew);
            }
            else {
                atom.keymaps.removeBindingsFromSource(omnisharpFileNew);
            }
        }));
        var disposable;
        var omnisharpAdvancedFileNew = this.getPackageDir() + "/omnisharp-atom/keymaps/omnisharp-advanced-file-new.cson";
        this.disposable.add(atom.config.observe("omnisharp-atom.useAdvancedFileNew", function (enabled) {
            if (enabled) {
                atom.keymaps.loadKeymap(omnisharpAdvancedFileNew);
                var anymenu = atom.menu;
                _.each(anymenu.template, function (template) {
                    var item = _.find(template.submenu, { command: "application:new-file" });
                    if (item) {
                        item.command = 'advanced-open-file:toggle';
                    }
                });
            }
            else {
                if (disposable)
                    disposable.dispose();
                atom.keymaps.removeBindingsFromSource(omnisharpAdvancedFileNew);
                var anymenu = atom.menu;
                _.each(anymenu.template, function (template) {
                    var item = _.find(template.submenu, { command: "advanced-open-file:toggle" });
                    if (item) {
                        item.command = 'application:new-file';
                    }
                });
            }
        }));
    };
    return OmniSharpAtom;
})();
var instance = new OmniSharpAtom;
module.exports = instance;
