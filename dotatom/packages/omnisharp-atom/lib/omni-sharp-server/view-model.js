var _ = require("lodash");
var omnisharp_client_1 = require("omnisharp-client");
var rx_1 = require("rx");
var path_1 = require("path");
var ProjectViewModel = (function () {
    function ProjectViewModel(name, path, solutionPath, frameworks, configurations, commands, sourceFiles) {
        var _this = this;
        if (frameworks === void 0) { frameworks = []; }
        if (configurations === void 0) { configurations = []; }
        if (commands === void 0) { commands = {}; }
        this.name = name;
        this.solutionPath = solutionPath;
        this.configurations = configurations;
        this.commands = commands;
        this.sourceFiles = sourceFiles;
        this.path = path_1.dirname(path);
        this.sourceFiles = (sourceFiles || []).map(path_1.normalize);
        this.frameworks = [{
                FriendlyName: 'All',
                Name: 'all',
                ShortName: 'all'
            }].concat(frameworks);
        this.activeFramework = this.frameworks[0];
        this.observe = {
            activeFramework: rx_1.Observable.ofObjectChanges(this)
                .where(function (z) { return z.name === "activeFramework"; })
                .map(function (z) { return _this.activeFramework; })
                .shareReplay(1)
        };
    }
    return ProjectViewModel;
})();
exports.ProjectViewModel = ProjectViewModel;
var ViewModel = (function () {
    function ViewModel(_client) {
        var _this = this;
        this._client = _client;
        this._disposable = new rx_1.CompositeDisposable();
        this.output = [];
        this.diagnostics = [];
        this.packageSources = [];
        this.runtime = '';
        this.projects = [];
        this._projectAddedStream = new rx_1.Subject();
        this._projectRemovedStream = new rx_1.Subject();
        this._projectChangedStream = new rx_1.Subject();
        this._uniqueId = _client.uniqueId;
        this._updateState(_client.currentState);
        this._observeProjectEvents();
        // Manage our build log for display
        this._disposable.add(_client.logs.subscribe(function (event) {
            _this.output.push(event);
            if (_this.output.length > 1000)
                _this.output.shift();
        }));
        this._disposable.add(_client.state.where(function (z) { return z === omnisharp_client_1.DriverState.Disconnected; }).subscribe(function () {
            _.each(_this.projects.slice(), function (project) { return _this._projectRemovedStream.onNext(project); });
            _this.projects = [];
            _this.diagnostics = [];
        }));
        var codecheck = this.setupCodecheck(_client);
        var status = this.setupStatus(_client);
        var output = this.output;
        var updates = rx_1.Observable.ofObjectChanges(this);
        var msbuild = this.setupMsbuild(_client);
        var dnx = this.setupDnx(_client);
        var scriptcs = this.setupScriptCs(_client);
        var _projectAddedStream = this._projectAddedStream;
        var _projectRemovedStream = this._projectRemovedStream;
        var _projectChangedStream = this._projectChangedStream;
        var projects = rx_1.Observable.merge(_projectAddedStream, _projectRemovedStream, _projectChangedStream)
            .map(function (z) { return _this.projects; });
        var outputObservable = _client.logs
            .window(_client.logs.throttle(100), function () { return rx_1.Observable.timer(100); })
            .flatMap(function (x) { return x.startWith(null).last(); })
            .map(function () { return output; });
        this.observe = {
            get codecheck() { return codecheck; },
            get output() { return outputObservable; },
            get status() { return status; },
            get updates() { return updates; },
            get projects() { return projects; },
            get projectAdded() { return _projectAddedStream; },
            get projectRemoved() { return _projectRemovedStream; },
            get projectChanged() { return _projectChangedStream; }
        };
        this._disposable.add(_client.state.subscribe(_.bind(this._updateState, this)));
        (window['clients'] || (window['clients'] = [])).push(this); //TEMP
        this._disposable.add(_client.state.where(function (z) { return z === omnisharp_client_1.DriverState.Connected; })
            .subscribe(function () {
            _client.projects({ ExcludeSourceFiles: false });
            _client.packagesource({ ProjectPath: _client.path })
                .subscribe(function (response) {
                _this.packageSources = response.Sources;
            });
        }));
        // MSBUILD
        this._disposable.add(_client.projectAdded
            .where(function (z) { return z.MsBuildProject != null; })
            .map(function (z) { return z.MsBuildProject; })
            .where(function (z) { return !_.any(_this.projects, { path: z.Path }); })
            .subscribe(function (project) {
            _this._projectAddedStream.onNext(new ProjectViewModel(project.AssemblyName, project.Path, _client.path, [{
                    FriendlyName: project.TargetFramework, Name: project.TargetFramework, ShortName: project.TargetFramework
                }], project.SourceFiles));
        }));
        this._disposable.add(_client.projectRemoved
            .where(function (z) { return z.MsBuildProject != null; })
            .map(function (z) { return z.MsBuildProject; })
            .subscribe(function (project) {
            _this._projectRemovedStream.onNext(_.find(_this.projects, { path: project.Path }));
        }));
        this._disposable.add(_client.projectChanged
            .where(function (z) { return z.MsBuildProject != null; })
            .map(function (z) { return z.MsBuildProject; })
            .subscribe(function (project) {
            var current = _.find(_this.projects, { path: project.Path });
            if (current) {
                var changed = new ProjectViewModel(project.AssemblyName, project.Path, _client.path, [{
                        FriendlyName: project.TargetFramework, Name: project.TargetFramework, ShortName: project.TargetFramework
                    }], project.SourceFiles);
                _.assign(current, changed);
                _this._projectChangedStream.onNext(current);
            }
        }));
        //DNX
        this._disposable.add(_client.projectAdded
            .where(function (z) { return z.DnxProject != null; })
            .map(function (z) { return z.DnxProject; })
            .where(function (z) { return !_.any(_this.projects, { path: z.Path }); })
            .subscribe(function (project) {
            _this._projectAddedStream.onNext(new ProjectViewModel(project.Name, project.Path, _client.path, project.Frameworks, project.Configurations, project.Commands, project.SourceFiles));
        }));
        this._disposable.add(_client.projectRemoved
            .where(function (z) { return z.DnxProject != null; })
            .map(function (z) { return z.DnxProject; })
            .subscribe(function (project) {
            _this._projectRemovedStream.onNext(_.find(_this.projects, { path: project.Path }));
        }));
        this._disposable.add(_client.projectChanged
            .where(function (z) { return z.DnxProject != null; })
            .map(function (z) { return z.DnxProject; })
            .subscribe(function (project) {
            var current = _.find(_this.projects, { path: project.Path });
            if (current) {
                var changed = new ProjectViewModel(project.Name, project.Path, _client.path, project.Frameworks, project.Configurations, project.Commands, project.SourceFiles);
                _.assign(current, changed);
                _this._projectChangedStream.onNext(current);
            }
        }));
    }
    Object.defineProperty(ViewModel.prototype, "uniqueId", {
        get: function () { return this._client.uniqueId; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "index", {
        get: function () { return this._client.index; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "path", {
        get: function () { return this._client.path; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "state", {
        get: function () { return this._client.currentState; },
        enumerable: true,
        configurable: true
    });
    ;
    ViewModel.prototype.dispose = function () {
        this._disposable.dispose();
    };
    ViewModel.prototype.getProjectForEditor = function (editor) {
        return this.getProjectForPath(editor.getPath())
            .where(function () { return !editor.isDestroyed(); });
    };
    ViewModel.prototype.getProjectForPath = function (path) {
        var o;
        if (this.isOn && this.projects.length) {
            o = rx_1.Observable.just(_.find(this.projects, function (x) { return _.startsWith(path, x.path); })).where(function (z) { return !!z; });
        }
        else {
            o = this._projectAddedStream.where(function (x) { return _.startsWith(path, x.path); }).take(1);
        }
        return o;
    };
    ViewModel.prototype.getProjectContainingEditor = function (editor) {
        return this.getProjectContainingFile(editor.getPath());
    };
    ViewModel.prototype.getProjectContainingFile = function (path) {
        var o;
        if (this.isOn && this.projects.length) {
            o = rx_1.Observable.just(_.find(this.projects, function (x) {
                return _.contains(x.sourceFiles, path_1.normalize(path));
            }))
                .take(1)
                .defaultIfEmpty(null);
        }
        else {
            o = this._projectAddedStream
                .where(function (x) { return _.contains(x.sourceFiles, path_1.normalize(path)); })
                .take(1)
                .defaultIfEmpty(null);
        }
        return o;
    };
    ViewModel.prototype._updateState = function (state) {
        this.isOn = state === omnisharp_client_1.DriverState.Connecting || state === omnisharp_client_1.DriverState.Connected;
        this.isOff = state === omnisharp_client_1.DriverState.Disconnected;
        this.isConnecting = state === omnisharp_client_1.DriverState.Connecting;
        this.isReady = state === omnisharp_client_1.DriverState.Connected;
        this.isError = state === omnisharp_client_1.DriverState.Error;
    };
    ViewModel.prototype._observeProjectEvents = function () {
        var _this = this;
        this._disposable.add(this._projectAddedStream
            .where(function (z) { return !_.any(_this.projects, { path: z.path }); })
            .subscribe(function (project) { return _this.projects.push(project); }));
        this._disposable.add(this._projectRemovedStream.subscribe(function (project) { return _.pull(_this.projects, _.find(_this.projects, function (z) { return z.path === project.path; })); }));
        this._disposable.add(this._projectChangedStream.subscribe(function (project) { return _.assign(_.find(_this.projects, function (z) { return z.path === project.path; }), project); }));
    };
    ViewModel.prototype.setupCodecheck = function (_client) {
        var _this = this;
        var codecheck = rx_1.Observable.merge(
        // Catch global code checks
        _client.observeCodecheck
            .where(function (z) { return !z.request.FileName; })
            .map(function (z) { return z.response; })
            .map(function (z) { return z.QuickFixes; }), 
        // Evict diagnostics from a code check for the given file
        // Then insert the new diagnostics
        _client.observeCodecheck
            .where(function (z) { return !!z.request.FileName; })
            .map(function (ctx) {
            var request = ctx.request, response = ctx.response;
            var results = _.filter(_this.diagnostics, function (fix) { return request.FileName !== fix.FileName; });
            results.unshift.apply(results, (response.QuickFixes));
            return results;
        }))
            .map(function (data) { return _.sortBy(data, function (quickFix) { return quickFix.LogLevel; }); })
            .startWith([])
            .shareReplay(1);
        this._disposable.add(codecheck.subscribe(function (data) { return _this.diagnostics = data; }));
        return codecheck;
    };
    ViewModel.prototype.setupStatus = function (_client) {
        var status = _client.status
            .startWith({})
            .share();
        return status;
    };
    ViewModel.prototype.setupMsbuild = function (_client) {
        var _this = this;
        var workspace = _client.observeProjects
            .where(function (z) { return z.response.MSBuild != null; })
            .where(function (z) { return z.response.MSBuild.Projects.length > 0; })
            .map(function (z) { return z.response.MSBuild; });
        this._disposable.add(workspace.subscribe(function (system) {
            _.each(system.Projects, function (p) {
                var project = new ProjectViewModel(p.AssemblyName, p.Path, _client.path, [{
                        FriendlyName: p.TargetFramework, Name: p.TargetFramework, ShortName: p.TargetFramework
                    }], p.SourceFiles);
                _this._projectAddedStream.onNext(project);
            });
        }));
        return workspace;
    };
    ViewModel.prototype.setupDnx = function (_client) {
        var _this = this;
        var workspace = _client.observeProjects
            .where(function (z) { return z.response.Dnx != null; })
            .where(function (z) { return z.response.Dnx.Projects.length > 0; })
            .map(function (z) { return z.response.Dnx; });
        this._disposable.add(workspace.subscribe(function (system) {
            _this.runtime = path_1.basename(system.RuntimePath);
            _this.runtimePath = system.RuntimePath;
            _.each(system.Projects, function (p) {
                var project = new ProjectViewModel(p.Name, p.Path, _client.path, p.Frameworks, p.Configurations, p.Commands, p.SourceFiles);
                _this._projectAddedStream.onNext(project);
            });
        }));
        return workspace;
    };
    ViewModel.prototype.setupScriptCs = function (_client) {
        var _this = this;
        var context = _client.observeProjects
            .where(function (z) { return z.response.ScriptCs != null; })
            .where(function (z) { return z.response.ScriptCs.CsxFiles.length > 0; })
            .map(function (z) { return z.response.ScriptCs; });
        this._disposable.add(context.subscribe(function (context) {
            _this._projectAddedStream.onNext(new ProjectViewModel("ScriptCs", context.Path, _client.path));
        }));
        return context;
    };
    return ViewModel;
})();
exports.ViewModel = ViewModel;
