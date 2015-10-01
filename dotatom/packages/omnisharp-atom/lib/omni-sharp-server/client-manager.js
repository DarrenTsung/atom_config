var _ = require('lodash');
var path = require('path');
var rx_1 = require("rx");
var Solution = require('./client');
var atom_projects_1 = require("./atom-projects");
var composite_client_1 = require('./composite-client');
var omnisharp_client_1 = require("omnisharp-client");
var generic_list_view_1 = require("../omnisharp-atom/views/generic-list-view");
var openSelectList;
var SolutionManager = (function () {
    function SolutionManager() {
        this._unitTestMode_ = false;
        this._configurations = new Set();
        this._solutions = new Map();
        this._solutionProjects = new Map();
        this._temporarySolutions = new WeakMap();
        this._disposableSolutionMap = new WeakMap();
        this._findSolutionCache = new Map();
        this._candidateFinderCache = new Set();
        this._activated = false;
        this._nextIndex = 0;
        this._activeSolutions = [];
        // this solution can be used to observe behavior across all solution.
        this._observation = new composite_client_1.ObservationClient();
        // this solution can be used to aggregate behavior across all solutions
        this._combination = new composite_client_1.CombinationClient();
        this._activeSolution = new rx_1.BehaviorSubject(null);
        this._activeSolutionObserable = this._activeSolution.shareReplay(1).distinctUntilChanged().where(function (z) { return !!z; });
        this._activatedSubject = new rx_1.Subject();
    }
    Object.defineProperty(SolutionManager.prototype, "activeClients", {
        get: function () {
            return this._activeSolutions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SolutionManager.prototype, "observationClient", {
        get: function () {
            return this._observation;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SolutionManager.prototype, "combinationClient", {
        get: function () {
            return this._combination;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SolutionManager.prototype, "activeClient", {
        get: function () {
            return this._activeSolutionObserable;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SolutionManager.prototype, "activatedSubject", {
        get: function () {
            return this._activatedSubject;
        },
        enumerable: true,
        configurable: true
    });
    SolutionManager.prototype.activate = function (activeEditor) {
        var _this = this;
        if (this._activated)
            return;
        this._disposable = new rx_1.CompositeDisposable();
        this._solutionDisposable = new rx_1.CompositeDisposable();
        this._atomProjects = new atom_projects_1.AtomProjectTracker();
        this._disposable.add(this._atomProjects);
        this._activeSearch = Promise.resolve(undefined);
        // monitor atom project paths
        this.subscribeToAtomProjectTracker();
        // We use the active editor on omnisharpAtom to
        // create another observable that chnages when we get a new solution.
        this._disposable.add(activeEditor
            .where(function (z) { return !!z; })
            .flatMap(function (z) { return _this.getClientForEditor(z); })
            .subscribe(function (x) { return _this._activeSolution.onNext(x); }));
        this._atomProjects.activate();
        this._activated = true;
        this.activatedSubject.onNext(true);
        this._disposable.add(this._solutionDisposable);
    };
    SolutionManager.prototype.connect = function () {
        this._solutions.forEach(function (solution) { return solution.connect(); });
    };
    SolutionManager.prototype.disconnect = function () {
        this._solutions.forEach(function (solution) { return solution.disconnect(); });
    };
    SolutionManager.prototype.deactivate = function () {
        if (this._unitTestMode_)
            return;
        this._activated = false;
        this._disposable.dispose();
        this.disconnect();
        this._solutions.clear();
        this._solutionProjects.clear();
        this._findSolutionCache.clear();
        //this._temporarySolutions.clear();
        //this._disposableSolutionMap.clear();
    };
    Object.defineProperty(SolutionManager.prototype, "connected", {
        get: function () {
            var iterator = this._solutions.values();
            var result = iterator.next();
            while (!result.done)
                if (result.value.currentState === omnisharp_client_1.DriverState.Connected)
                    return true;
            return false;
        },
        enumerable: true,
        configurable: true
    });
    SolutionManager.prototype.subscribeToAtomProjectTracker = function () {
        var _this = this;
        this._disposable.add(this._atomProjects.removed
            .where(function (z) { return _this._solutions.has(z); })
            .subscribe(function (project) { return _this.removeSolution(project); }));
        this._disposable.add(this._atomProjects.added
            .where(function (project) { return !_this._solutionProjects.has(project); })
            .map(function (project) {
            return _this.candidateFinder(project, console)
                .flatMap(function (candidates) { return addCandidatesInOrder(candidates, function (candidate) { return _this.addSolution(candidate, { project: project }); }); });
        })
            .subscribe(function (candidateObservable) {
            _this._activeSearch = _this._activeSearch.then(function () { return candidateObservable.toPromise(); });
        }));
    };
    SolutionManager.prototype.findRepositoryForPath = function (workingPath) {
        if (atom.project)
            return _.find(atom.project.getRepositories(), function (repo) { return repo && path.normalize(repo.getWorkingDirectory()) === path.normalize(workingPath); });
    };
    SolutionManager.prototype.addSolution = function (candidate, _a) {
        var _this = this;
        var _b = _a.temporary, temporary = _b === void 0 ? false : _b, project = _a.project;
        var projectPath = candidate;
        if (_.endsWith(candidate, '.sln')) {
            candidate = path.dirname(candidate);
        }
        if (this._solutions.has(candidate))
            return rx_1.Observable.just(this._solutions.get(candidate));
        if (project && this._solutionProjects.has(project)) {
            return rx_1.Observable.just(this._solutionProjects.get(project));
        }
        var solution = new Solution({
            projectPath: projectPath,
            index: ++this._nextIndex,
            temporary: temporary,
            repository: this.findRepositoryForPath(candidate)
        });
        var cd = new rx_1.CompositeDisposable();
        this._solutionDisposable.add(cd);
        this._disposableSolutionMap.set(solution, cd);
        cd.add(rx_1.Disposable.create(function () {
            _.pull(_this._activeSolutions, solution);
            _this._solutions.delete(candidate);
            if (_this._temporarySolutions.has(solution)) {
                _this._temporarySolutions.delete(solution);
            }
            if (_this._activeSolution.getValue() === solution) {
                _this._activeSolution.onNext(_this._activeSolutions.length ? _this._activeSolutions[0] : null);
            }
        }));
        cd.add(solution);
        this._configurations.forEach(function (config) { return config(solution); });
        this._solutions.set(candidate, solution);
        // keep track of the active solutions
        cd.add(this._observation.add(solution));
        cd.add(this._combination.add(solution));
        if (temporary) {
            var tempD = rx_1.Disposable.create(function () { });
            tempD.dispose();
            this._temporarySolutions.set(solution, new rx_1.RefCountDisposable(tempD));
        }
        this._activeSolutions.push(solution);
        if (this._activeSolutions.length === 1)
            this._activeSolution.onNext(solution);
        // Auto start, with a little delay
        /*if (atom.config.get('omnisharp-atom.autoStartOnCompatibleFile')) {
            _.defer(() => solution.connect());
        }*/
        var result = this.addSolutionSubscriptions(solution, cd);
        solution.connect();
        return result;
    };
    SolutionManager.prototype.addSolutionSubscriptions = function (solution, cd) {
        var _this = this;
        var result = new rx_1.AsyncSubject();
        var errorResult = solution.state
            .where(function (z) { return z === omnisharp_client_1.DriverState.Error; })
            .delay(100)
            .take(1);
        cd.add(errorResult.subscribe(function () { return result.onCompleted(); })); // If this solution errors move on to the next
        cd.add(solution.model.observe.projectAdded.subscribe(function (project) { return _this._solutionProjects.set(project.path, solution); }));
        cd.add(solution.model.observe.projectRemoved.subscribe(function (project) { return _this._solutionProjects.delete(project.path); }));
        // Wait for the projects to return from the solution
        cd.add(solution.model.observe.projects
            .debounce(100)
            .take(1)
            .map(function () { return solution; })
            .timeout(15000, rx_1.Scheduler.timeout) // Wait 30 seconds for the project to load.
            .subscribe(function () {
            // We loaded successfully return the solution
            result.onNext(solution);
            result.onCompleted();
        }, function () {
            // Move along.
            result.onCompleted();
        }));
        return result;
    };
    SolutionManager.prototype.removeSolution = function (candidate) {
        if (this._unitTestMode_)
            return;
        if (_.endsWith(candidate, '.sln')) {
            candidate = path.dirname(candidate);
        }
        var solution = this._solutions.get(candidate);
        var refCountDisposable = solution && this._temporarySolutions.has(solution) && this._temporarySolutions.get(solution);
        if (refCountDisposable) {
            refCountDisposable.dispose();
            if (!refCountDisposable.isDisposed) {
                return;
            }
        }
        // keep track of the removed solutions
        if (solution) {
            solution.disconnect();
            var disposable = this._disposableSolutionMap.get(solution);
            if (disposable)
                disposable.dispose();
        }
    };
    SolutionManager.prototype.getSolutionForActiveEditor = function () {
        var editor = atom.workspace.getActiveTextEditor();
        var solution;
        if (editor)
            solution = this.getClientForEditor(editor);
        if (solution)
            return solution;
        // No active text editor
        return rx_1.Observable.empty();
    };
    SolutionManager.prototype.getClientForPath = function (path) {
        var solution;
        if (!path)
            // No text editor found
            return rx_1.Observable.empty();
        var isCsx = _.endsWith(path, '.csx');
        var location = path;
        if (!location) {
            // Text editor not saved yet?
            return rx_1.Observable.empty();
        }
        var _a = this.getSolutionForUnderlyingPath(location, isCsx), intersect = _a[0], solutionValue = _a[1];
        if (solutionValue)
            return rx_1.Observable.just(solutionValue);
        return this.findSolutionForUnderlyingPath(location, isCsx)
            .map(function (z) {
            var p = z[0], solution = z[1], temporary = z[2];
            return solution;
        });
    };
    SolutionManager.prototype.getClientForEditor = function (editor) {
        return this._getClientForEditor(editor).where(function () { return !editor.isDestroyed(); });
    };
    SolutionManager.prototype._getClientForEditor = function (editor) {
        var _this = this;
        var solution;
        if (!editor)
            // No text editor found
            return rx_1.Observable.empty();
        var isCsx = editor.getGrammar().name === "C# Script File" || _.endsWith(editor.getPath(), '.csx');
        var p = editor.omniProject;
        // Not sure if we should just add properties onto editors...
        // but it works...
        if (p && this._solutions.has(p)) {
            var solutionValue = this._solutions.get(p);
            // If the solution has disconnected, reconnect it
            if (solutionValue.currentState === omnisharp_client_1.DriverState.Disconnected && atom.config.get('omnisharp-atom.autoStartOnCompatibleFile'))
                solutionValue.connect();
            // Client is in an invalid state
            if (solutionValue.currentState === omnisharp_client_1.DriverState.Error) {
                return rx_1.Observable.empty();
            }
            solution = rx_1.Observable.just(solutionValue);
            if (solutionValue && this._temporarySolutions.has(solutionValue)) {
                this.setupDisposableForTemporaryClient(solutionValue, editor);
            }
            return solution;
        }
        var location = editor.getPath();
        if (!location) {
            // Text editor not saved yet?
            return rx_1.Observable.empty();
        }
        if (editor._metadataEditor) {
            // client / server doesn't work currently for metadata documents.
            return rx_1.Observable.empty();
        }
        var _a = this.getSolutionForUnderlyingPath(location, isCsx), intersect = _a[0], solutionValue = _a[1];
        p = editor.omniProject = intersect;
        editor.__omniClient__ = solutionValue;
        if (solutionValue && this._temporarySolutions.has(solutionValue)) {
            this.setupDisposableForTemporaryClient(solutionValue, editor);
        }
        if (solutionValue)
            return rx_1.Observable.just(solutionValue);
        return this.findSolutionForUnderlyingPath(location, isCsx)
            .map(function (z) {
            var p = z[0], solution = z[1], temporary = z[2];
            editor.omniProject = p;
            editor.__omniClient__ = solution;
            if (temporary) {
                _this.setupDisposableForTemporaryClient(solution, editor);
            }
            return solution;
        });
    };
    SolutionManager.prototype._isPartOfSolution = function (location, cb) {
        for (var _i = 0, _a = this._activeSolutions; _i < _a.length; _i++) {
            var solution = _a[_i];
            var paths = solution.model.projects.map(function (z) { return z.path; });
            var intersect = intersectPath(location, paths);
            if (intersect) {
                return cb(intersect, solution);
            }
        }
    };
    SolutionManager.prototype.getSolutionForUnderlyingPath = function (location, isCsx) {
        if (location === undefined) {
            return;
        }
        if (isCsx) {
            // CSX are special, and need a solution per directory.
            var directory = path.dirname(location);
            if (this._solutions.has(directory))
                return [directory, this._solutions.get(directory)];
            return [null, null];
        }
        else {
            var intersect = intersectPath(location, fromIterator(this._solutions.keys()));
            if (intersect) {
                return [intersect, this._solutions.get(intersect)];
            }
        }
        if (!isCsx) {
            // Attempt to see if this file is part a solution
            var r = this._isPartOfSolution(location, function (intersect, solution) { return [solution.path, solution]; });
            if (r) {
                return r;
            }
        }
        return [null, null];
    };
    SolutionManager.prototype.findSolutionForUnderlyingPath = function (location, isCsx) {
        var _this = this;
        var directory = path.dirname(location);
        var subject = new rx_1.AsyncSubject();
        if (!this._activated) {
            return this.activatedSubject.take(1)
                .flatMap(function () { return _this.findSolutionForUnderlyingPath(location, isCsx); });
        }
        if (this._findSolutionCache.has(location)) {
            return this._findSolutionCache.get(location);
        }
        this._findSolutionCache.set(location, subject);
        subject.tapOnCompleted(function () { return _this._findSolutionCache.delete(location); });
        var project = intersectPath(directory, this._atomProjects.paths);
        var cb = function (candidates) {
            // We only want to search for solutions after the main solutions have been processed.
            // We can get into this race condition if the user has windows that were opened previously.
            if (!_this._activated) {
                _.delay(cb, 5000);
                return;
            }
            if (!isCsx) {
                // Attempt to see if this file is part a solution
                var r = _this._isPartOfSolution(location, function (intersect, solution) {
                    subject.onNext([solution.path, solution, false]); // The boolean means this solution is temporary.
                    subject.onCompleted();
                    return true;
                });
                if (r)
                    return;
            }
            var newCandidates = _.difference(candidates, fromIterator(_this._solutions.keys()));
            _this._activeSearch.then(function () { return addCandidatesInOrder(newCandidates, function (candidate) { return _this.addSolution(candidate, { temporary: !project }); })
                .subscribeOnCompleted(function () {
                if (!isCsx) {
                    // Attempt to see if this file is part a solution
                    var r = _this._isPartOfSolution(location, function (intersect, solution) {
                        subject.onNext([solution.path, solution, false]); // The boolean means this solution is temporary.
                        subject.onCompleted();
                        return;
                    });
                    if (r)
                        return;
                }
                var intersect = intersectPath(location, fromIterator(_this._solutions.keys())) || intersectPath(location, _this._atomProjects.paths);
                if (intersect) {
                    subject.onNext([intersect, _this._solutions.get(intersect), !project]); // The boolean means this solution is temporary.
                }
                else {
                    subject.onError('Could not find a solution for location ' + location);
                }
                subject.onCompleted();
            }); });
        };
        var foundCandidates = this.candidateFinder(directory, console)
            .subscribe(cb);
        return subject;
    };
    SolutionManager.prototype.candidateFinder = function (directory, console) {
        var _this = this;
        return omnisharp_client_1.findCandidates(directory, console)
            .flatMap(function (candidates) {
            var slns = _.filter(candidates, function (x) { return _.endsWith(x, '.sln'); });
            if (slns.length > 1) {
                var items = _.difference(candidates, slns);
                var asyncResult = new rx_1.AsyncSubject();
                asyncResult.onNext(items);
                // handle multiple solutions.
                var listView = new generic_list_view_1.GenericSelectListView('', slns.map(function (x) { return ({ displayName: x, name: x }); }), function (result) {
                    items.unshift(result);
                    _.each(candidates, function (x) { return _this._candidateFinderCache.add(x); });
                    asyncResult.onCompleted();
                }, function () {
                    asyncResult.onCompleted();
                });
                listView.message.text('Please select a solution to load.');
                // Show the view
                if (openSelectList) {
                    openSelectList.onClosed.subscribe(function () {
                        if (!_.any(slns, function (x) { return _this._candidateFinderCache.has(x); }))
                            _.defer(function () { return listView.toggle(); });
                        else
                            asyncResult.onCompleted();
                    });
                }
                else {
                    _.defer(function () { return listView.toggle(); });
                }
                asyncResult.doOnCompleted(function () { return openSelectList = null; });
                openSelectList = listView;
                return asyncResult;
            }
            else {
                return rx_1.Observable.just(candidates);
            }
        });
    };
    SolutionManager.prototype.setupDisposableForTemporaryClient = function (solution, editor) {
        var _this = this;
        if (solution && !editor['__setup_temp__'] && this._temporarySolutions.has(solution)) {
            var refCountDisposable = this._temporarySolutions.get(solution);
            var disposable = refCountDisposable.getDisposable();
            editor['__setup_temp__'] = true;
            editor.onDidDestroy(function () {
                disposable.dispose();
                _this.removeSolution(solution.path);
            });
        }
    };
    SolutionManager.prototype.registerConfiguration = function (callback) {
        this._configurations.add(callback);
        this._solutions.forEach(function (solution) { return callback(solution); });
    };
    return SolutionManager;
})();
function intersectPath(location, paths) {
    var segments = location.split(path.sep);
    var mappedLocations = segments.map(function (loc, index) {
        return _.take(segments, index + 1).join(path.sep);
    });
    // Look for the closest match first.
    mappedLocations.reverse();
    var intersect = _(mappedLocations).intersection(paths).first();
    if (intersect) {
        return intersect;
    }
}
function addCandidatesInOrder(candidates, cb) {
    var asyncSubject = new rx_1.AsyncSubject();
    if (!candidates.length) {
        asyncSubject.onNext(candidates);
        asyncSubject.onCompleted();
        return asyncSubject;
    }
    var cds = candidates.slice();
    var candidate = cds.shift();
    var handleCandidate = function (candidate) {
        cb(candidate).subscribeOnCompleted(function () {
            if (cds.length) {
                candidate = cds.shift();
                handleCandidate(candidate);
            }
            else {
                asyncSubject.onNext(candidates);
                asyncSubject.onCompleted();
            }
        });
    };
    handleCandidate(candidate);
    return asyncSubject.asObservable();
}
function fromIterator(iterator) {
    var items = [];
    var _a = iterator.next(), done = _a.done, value = _a.value;
    while (!done) {
        items.push(value);
        var _b = iterator.next(), done = _b.done, value = _b.value;
    }
    return items;
}
var instance = new SolutionManager();
module.exports = instance;
