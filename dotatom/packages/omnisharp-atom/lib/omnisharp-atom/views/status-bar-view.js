var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var rx_1 = require("rx");
var _ = require('lodash');
var Omni = require('../../omni-sharp-server/omni');
var server_information_1 = require("../features/server-information");
var solution_information_1 = require("../features/solution-information");
var world_1 = require('../world');
var code_check_1 = require("../features/code-check");
var command_runner_1 = require("../features/command-runner");
var fastdom_1 = require("fastdom");
function addClassIfNotContains(icon) {
    var cls = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        cls[_i - 1] = arguments[_i];
    }
    _.each(cls, function (cls) {
        fastdom_1.read(function () {
            if (!icon.classList.contains(cls))
                fastdom_1.write(function () { return icon.classList.add(cls); });
        });
    });
}
function removeClassIfContains(icon) {
    var cls = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        cls[_i - 1] = arguments[_i];
    }
    _.each(cls, function (cls) {
        fastdom_1.read(function () {
            if (icon.classList.contains(cls))
                fastdom_1.write(function () { return icon.classList.remove(cls); });
        });
    });
}
var FlameElement = (function (_super) {
    __extends(FlameElement, _super);
    function FlameElement() {
        _super.apply(this, arguments);
    }
    FlameElement.prototype.createdCallback = function () {
        this.classList.add('omnisharp-atom-button');
        this._state = { status: {} };
        var icon = this._icon = document.createElement('span');
        icon.classList.add('icon', 'icon-flame');
        this.appendChild(icon);
        var outgoing = this._outgoing = document.createElement('span');
        outgoing.classList.add('outgoing-requests');
        this.appendChild(outgoing);
    };
    FlameElement.prototype.updateState = function (state) {
        _.assign(this._state, state);
        var icon = this._icon;
        if (this._state.isOff) {
            removeClassIfContains(icon, 'text-subtle');
        }
        else {
            addClassIfNotContains(icon, 'text-subtle');
        }
        if (this._state.isReady) {
            addClassIfNotContains(icon, 'text-success');
        }
        else {
            removeClassIfContains(icon, 'text-success');
        }
        if (this._state.isError) {
            addClassIfNotContains(icon, 'text-error');
        }
        else {
            removeClassIfContains(icon, 'text-error');
        }
        if (this._state.isConnecting) {
            addClassIfNotContains(icon, 'icon-flame-loading');
            removeClassIfContains(icon, 'icon-flame-processing');
            removeClassIfContains(icon, 'icon-flame-loading');
        }
        else if (this._state.status.hasOutgoingRequests) {
            addClassIfNotContains(icon, 'icon-flame-processing');
            removeClassIfContains(icon, 'icon-flame-loading');
        }
        else {
            removeClassIfContains(icon, 'icon-flame-processing');
            removeClassIfContains(icon, 'icon-flame-loading');
        }
    };
    FlameElement.prototype.updateOutgoing = function (status) {
        var _this = this;
        if (status.hasOutgoingRequests) {
            removeClassIfContains(this._outgoing, 'fade');
        }
        else {
            addClassIfNotContains(this._outgoing, 'fade');
        }
        if (status.outgoingRequests !== this._state.status.outgoingRequests) {
            fastdom_1.write(function () { return _this._outgoing.innerText = _this._state.status.outgoingRequests.toString(); });
        }
        this._state.status = status || {};
        this.updateState(this._state);
    };
    return FlameElement;
})(HTMLAnchorElement);
exports.FlameElement = FlameElement;
exports.FlameElement = document.registerElement('omnisharp-flame', { prototype: FlameElement.prototype });
(function (CommandRunnerState) {
    CommandRunnerState[CommandRunnerState["Running"] = 0] = "Running";
    CommandRunnerState[CommandRunnerState["Started"] = 1] = "Started";
    CommandRunnerState[CommandRunnerState["Off"] = 2] = "Off";
})(exports.CommandRunnerState || (exports.CommandRunnerState = {}));
var CommandRunnerState = exports.CommandRunnerState;
;
var CommandRunnerElement = (function (_super) {
    __extends(CommandRunnerElement, _super);
    function CommandRunnerElement() {
        _super.apply(this, arguments);
    }
    CommandRunnerElement.prototype.createdCallback = function () {
        this.classList.add('omnisharp-atom-button', 'icon', 'icon-clock');
    };
    CommandRunnerElement.prototype.attachedCallback = function () {
        if (this._state === undefined)
            this.updateState(CommandRunnerState.Off);
    };
    CommandRunnerElement.prototype.updateState = function (state) {
        var _this = this;
        if (this._state !== state) {
            this._state = state;
            if (state == CommandRunnerState.Running) {
                addClassIfNotContains(this, 'text-info');
                removeClassIfContains(this, 'text-subtle', 'icon-flame-loading');
            }
            else {
                removeClassIfContains(this, 'text-info');
                addClassIfNotContains(this, 'text-subtle', 'icon-flame-loading');
            }
            if (state === CommandRunnerState.Off) {
                fastdom_1.read(function () { return _this.style.display !== 'none' && fastdom_1.write(function () { return _this.style.display = 'none'; }); });
            }
            else {
                fastdom_1.read(function () { return _this.style.display === 'none' && fastdom_1.write(function () { return _this.style.display = ''; }); });
            }
        }
    };
    return CommandRunnerElement;
})(HTMLAnchorElement);
exports.CommandRunnerElement = CommandRunnerElement;
exports.CommandRunnerElement = document.registerElement('omnisharp-command-runner', { prototype: CommandRunnerElement.prototype });
var DiagnosticsElement = (function (_super) {
    __extends(DiagnosticsElement, _super);
    function DiagnosticsElement() {
        _super.apply(this, arguments);
    }
    DiagnosticsElement.prototype.createdCallback = function () {
        var _this = this;
        this.classList.add('inline-block', 'error-warning-summary');
        var sync = this._sync = document.createElement('a');
        sync.classList.add('icon', 'icon-sync', 'text-subtle');
        this.appendChild(sync);
        sync.onclick = function () { return _this.syncClick(); };
        var s = document.createElement('span');
        this.appendChild(s);
        s.onclick = function () { return _this.diagnosticClick(); };
        var errorsIcon = document.createElement('span');
        errorsIcon.classList.add('icon', 'icon-issue-opened');
        s.appendChild(errorsIcon);
        var errors = this._errors = document.createElement('span');
        errors.classList.add('error-summary');
        s.appendChild(errors);
        var warningsIcon = document.createElement('span');
        warningsIcon.classList.add('icon', 'icon-alert');
        s.appendChild(warningsIcon);
        var warnings = this._warnings = document.createElement('span');
        warnings.classList.add('warning-summary');
        s.appendChild(warnings);
    };
    DiagnosticsElement.prototype.updateState = function (state) {
        var _this = this;
        if (!_.isEqual(this._state, state)) {
            this._state = state;
            fastdom_1.write(function () { return _this._errors.innerText = _this._state.errorCount.toString(); });
            fastdom_1.write(function () { return _this._warnings.innerText = _this._state.warningCount.toString(); });
        }
    };
    return DiagnosticsElement;
})(HTMLAnchorElement);
exports.DiagnosticsElement = DiagnosticsElement;
exports.DiagnosticsElement = document.registerElement('omnisharp-diagnostics', { prototype: DiagnosticsElement.prototype });
var ProjectCountElement = (function (_super) {
    __extends(ProjectCountElement, _super);
    function ProjectCountElement() {
        _super.apply(this, arguments);
    }
    ProjectCountElement.prototype.createdCallback = function () {
        this.classList.add('inline-block', 'project-summary', 'projects-icon');
        var icon = document.createElement('span');
        icon.classList.add('icon', 'icon-pulse');
        this.appendChild(icon);
        var sub = this._solutionNunmber = document.createElement('sub');
        icon.appendChild(sub);
        var projects = this.projects = document.createElement('span');
        projects.classList.add('projects');
        projects.innerText = '0 Projects';
        this.appendChild(projects);
    };
    ProjectCountElement.prototype.updateState = function (state) {
        var _this = this;
        if (!_.isEqual(this._state, state)) {
            this._state = state;
            fastdom_1.write(function () { return _this.projects.innerText = _this._state.projectCount + " Projects"; });
        }
    };
    ProjectCountElement.prototype.updateSolutionNumber = function (solutionNumber) {
        var _this = this;
        fastdom_1.write(function () { return _this._solutionNunmber.innerText = solutionNumber; });
    };
    return ProjectCountElement;
})(HTMLAnchorElement);
exports.ProjectCountElement = ProjectCountElement;
exports.ProjectCountElement = document.registerElement('omnisharp-project-count', { prototype: ProjectCountElement.prototype });
var StatusBarElement = (function (_super) {
    __extends(StatusBarElement, _super);
    function StatusBarElement() {
        _super.apply(this, arguments);
        this._hasValidEditor = false;
    }
    StatusBarElement.prototype.createdCallback = function () {
        var _this = this;
        this.classList.add('inline-block');
        var flameElement = this._flame = new exports.FlameElement();
        this.appendChild(flameElement);
        flameElement.onclick = function () { return _this.toggle(); };
        var commandRunnerElement = this._commandRunner = new exports.CommandRunnerElement();
        this.appendChild(commandRunnerElement);
        var projectCount = this._projectCount = new exports.ProjectCountElement();
        this.appendChild(projectCount);
        projectCount.onclick = function () { return _this.toggleSolutionInformation(); };
        projectCount.style.display = 'none';
        projectCount.projects.style.display = 'none';
        var diagnostics = this._diagnostics = new exports.DiagnosticsElement();
        this.appendChild(diagnostics);
        diagnostics.diagnosticClick = function () { return _this.toggleErrorWarningPanel(); };
        diagnostics.syncClick = function () { return _this.doCodeCheck(); };
        diagnostics.style.display = 'none';
        this._disposable = new rx_1.CompositeDisposable();
        this._state = { status: {} };
    };
    StatusBarElement.prototype.attachedCallback = function () {
        var _this = this;
        this._disposable.add(code_check_1.codeCheck.observe.diagnostics.subscribe(function (diagnostics) {
            var counts = _.countBy(diagnostics, function (quickFix) { return quickFix.LogLevel; });
            _this._diagnostics.updateState({
                errorCount: counts['Error'] || 0,
                warningCount: counts['Warning'] || 0
            });
        }));
        this._disposable.add(world_1.world.observe.updates
            .buffer(world_1.world.observe.updates.throttle(500), function () { return rx_1.Observable.timer(500); })
            .subscribe(function (items) {
            var updates = _(items)
                .filter(function (item) { return _.contains(['isOff', 'isConnecting', 'isOn', 'isReady', 'isError'], item.name); })
                .value();
            if (updates.length) {
                var update = {};
                _.each(updates, function (item) {
                    update[item.name] = world_1.world[item.name];
                });
                _this._flame.updateState(update);
                _.assign(_this._state, update);
                _this._updateVisible();
            }
        }));
        this._disposable.add(server_information_1.server.observe.projects
            .debounce(500)
            .subscribe(function (projects) { return _this._projectCount.updateState({ projectCount: projects.length }); }));
        this._disposable.add(server_information_1.server.observe.status
            .subscribe(function (status) { return _this._flame.updateOutgoing(status || {}); }));
        this._disposable.add(server_information_1.server.observe.model
            .subscribe(function (model) {
            var solutionNumber = solution_information_1.solutionInformation.solutions.length > 1 ? _.trim(server_information_1.server.model && server_information_1.server.model.index, 'client') : '';
            _this._projectCount.updateSolutionNumber(solutionNumber);
        }));
        this._disposable.add(Omni.activeEditorOrConfigEditor.subscribe(function (editor) {
            _this._updateVisible(!!editor);
        }));
        this._disposable.add(command_runner_1.commandRunner.observe.processes
            .subscribe(function (processes) {
            if (_.all(processes, function (process) { return process.started; }))
                _this._commandRunner.updateState(CommandRunnerState.Started);
            else if (processes.length > 0)
                _this._commandRunner.updateState(CommandRunnerState.Running);
            else
                _this._commandRunner.updateState(CommandRunnerState.Off);
        }));
        this._disposable.add(solution_information_1.solutionInformation.observe.solutions
            .subscribe(function (solutions) {
            var solutionNumber = solutions.length > 1 ? _.trim(server_information_1.server.model && server_information_1.server.model.index, 'client') : '';
            _this._projectCount.updateSolutionNumber(solutionNumber);
        }));
    };
    StatusBarElement.prototype._updateVisible = function (hasValidEditor) {
        var _this = this;
        if (typeof hasValidEditor !== 'undefined') {
            this._hasValidEditor = hasValidEditor;
        }
        if (this._state.isOn) {
            fastdom_1.read(function () { return _this._projectCount.style.display === 'none' && fastdom_1.write(function () { return _this._projectCount.style.display = ''; }); });
        }
        if (this._state.isOn && this._hasValidEditor) {
            this._showOnStateItems();
        }
        else {
            this._hideOnStateItems();
        }
    };
    StatusBarElement.prototype._showOnStateItems = function () {
        var _this = this;
        fastdom_1.read(function () { return _this._diagnostics.style.display === 'none' && fastdom_1.write(function () { return _this._diagnostics.style.display = ''; }); });
        fastdom_1.read(function () { return _this._projectCount.projects.style.display === 'none' && fastdom_1.write(function () { return _this._projectCount.projects.style.display = ''; }); });
    };
    StatusBarElement.prototype._hideOnStateItems = function () {
        var _this = this;
        fastdom_1.read(function () { return _this._diagnostics.style.display !== 'none' && fastdom_1.write(function () { return _this._diagnostics.style.display = 'none'; }); });
        fastdom_1.read(function () { return _this._projectCount.projects.style.display !== 'none' && fastdom_1.write(function () { return _this._projectCount.projects.style.display = 'none'; }); });
    };
    StatusBarElement.prototype.detachedCallback = function () {
        this._disposable.dispose();
    };
    StatusBarElement.prototype.dispose = function () {
        this._disposable.dispose();
    };
    StatusBarElement.prototype.toggle = function () {
        atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:toggle-dock');
    };
    StatusBarElement.prototype.toggleErrorWarningPanel = function () {
        atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:toggle-errors');
    };
    StatusBarElement.prototype.toggleSolutionInformation = function () {
        atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:solution-status');
    };
    StatusBarElement.prototype.doCodeCheck = function () {
        atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:code-check');
    };
    return StatusBarElement;
})(HTMLElement);
exports.StatusBarElement = StatusBarElement;
exports.StatusBarElement = document.registerElement('omnisharp-status-bar', { prototype: StatusBarElement.prototype });
