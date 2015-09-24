var rx_1 = require("rx");
var _ = require('lodash');
var Omni = require('../../omni-sharp-server/omni');
var UpdateProject = (function () {
    function UpdateProject() {
        this._notifications = {};
        this.required = true;
        this.title = 'Atom Project Updater';
        this.description = 'Adds support for detecting external projects and if atom is looking at the wrong project folder.';
    }
    UpdateProject.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        atom.config.observe("omnisharp-atom.autoAdjustTreeView", function (value) { return _this._autoAdjustTreeView = value; });
        atom.config.observe("omnisharp-atom.nagAdjustTreeView", function (value) { return _this._nagAdjustTreeView = value; });
        atom.config.observe("omnisharp-atom.autoAddExternalProjects", function (value) { return _this._autoAddExternalProjects = value; });
        atom.config.observe("omnisharp-atom.nagAddExternalProjects", function (value) { return _this._nagAddExternalProjects = value; });
        // We're keeping track of paths, just so we have a local reference
        this._paths = atom.project.getPaths();
        atom.project.onDidChangePaths(function (paths) { return _this._paths = paths; });
        this.disposable.add(Omni.listener.model.projectAdded
            .where(function (z) { return _this._autoAddExternalProjects || _this._nagAddExternalProjects; })
            .where(function (z) { return !_.startsWith(z.path, z.solutionPath); })
            .where(function (z) { return !_.any(_this._paths, function (x) { return _.startsWith(z.path, x); }); })
            .buffer(Omni.listener.model.projectAdded.throttle(1000), function () { return rx_1.Observable.timer(1000); })
            .where(function (z) { return z.length > 0; })
            .subscribe(function (project) { return _this.handleProjectAdded(project); }));
        this.disposable.add(Omni.listener.model.projectRemoved
            .where(function (z) { return _this._autoAddExternalProjects || _this._nagAddExternalProjects; })
            .where(function (z) { return !_.startsWith(z.path, z.solutionPath); })
            .where(function (z) { return _.any(_this._paths, function (x) { return _.startsWith(z.path, x); }); })
            .buffer(Omni.listener.model.projectRemoved.throttle(1000), function () { return rx_1.Observable.timer(1000); })
            .where(function (z) { return z.length > 0; })
            .subscribe(function (project) { return _this.handleProjectRemoved(project); }));
        Omni.registerConfiguration(function (client) {
            if (!client.temporary) {
                var path = _.find(_this._paths, function (x) { return _.startsWith(x, client.path) && x !== client.path; });
                if (path) {
                    if (_this._autoAdjustTreeView) {
                        _this.adjustTreeView(path, client.path);
                    }
                    else if (_this._nagAdjustTreeView) {
                        // notify for adjustment
                        var notification = atom.notifications.addInfo("Show solution root?", {
                            detail: path + "\n-> " + client.path,
                            description: 'It appears the solution root is not displayed in the treeview.  Would you like to show the entire solution in the tree view?',
                            buttons: [
                                {
                                    text: 'Okay',
                                    className: 'btn-success',
                                    onDidClick: function () {
                                        _this.adjustTreeView(path, client.path);
                                        notification.dismiss();
                                    }
                                }, {
                                    text: 'Dismiss',
                                    onDidClick: function () {
                                        notification.dismiss();
                                    }
                                }
                            ],
                            dismissable: true
                        });
                    }
                }
            }
        });
    };
    UpdateProject.prototype.adjustTreeView = function (oldPath, newPath) {
        var newPaths = this._paths.slice();
        newPaths.splice(_.findIndex(this._paths, oldPath), 1, newPath);
        atom.project.setPaths(newPaths);
    };
    UpdateProject.prototype.handleProjectAdded = function (projects) {
        var paths = _.unique(projects.map(function (z) { return z.path; }));
        if (this._autoAddExternalProjects) {
            for (var _i = 0; _i < paths.length; _i++) {
                var project = paths[_i];
                atom.project.addPath(project);
            }
        }
        else if (this._nagAddExternalProjects) {
            var notification = atom.notifications.addInfo("Add external projects?", {
                detail: paths.join('\n'),
                description: "We have detected external projects would you like to add them to the treeview?",
                buttons: [
                    {
                        text: 'Okay',
                        className: 'btn-success',
                        onDidClick: function () {
                            for (var _i = 0; _i < paths.length; _i++) {
                                var project = paths[_i];
                                atom.project.addPath(project);
                            }
                            notification.dismiss();
                        }
                    }, {
                        text: 'Dismiss',
                        onDidClick: function () {
                            notification.dismiss();
                        }
                    }
                ],
                dismissable: true
            });
        }
    };
    UpdateProject.prototype.handleProjectRemoved = function (projects) {
        var paths = _.unique(projects.map(function (z) { return z.path; }));
        if (this._autoAddExternalProjects) {
            for (var _i = 0; _i < paths.length; _i++) {
                var project = paths[_i];
                atom.project.removePath(project);
            }
        }
        else if (this._nagAddExternalProjects) {
            var notification = atom.notifications.addInfo("Remove external projects?", {
                detail: paths.join('\n'),
                description: "We have detected external projects have been removed, would you like to remove them from the treeview?",
                buttons: [
                    {
                        text: 'Okay',
                        className: 'btn-success',
                        onDidClick: function () {
                            for (var _i = 0; _i < paths.length; _i++) {
                                var project = paths[_i];
                                atom.project.removePath(project);
                            }
                            notification.dismiss();
                        }
                    }, {
                        text: 'Dismiss',
                        onDidClick: function () {
                            notification.dismiss();
                        }
                    }
                ],
                dismissable: true
            });
        }
    };
    UpdateProject.prototype.attach = function () { };
    UpdateProject.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return UpdateProject;
})();
exports.updateProject = new UpdateProject;
