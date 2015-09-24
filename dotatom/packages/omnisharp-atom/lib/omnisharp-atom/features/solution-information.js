var rx_1 = require("rx");
var _ = require('lodash');
var solution_status_view_1 = require('../views/solution-status-view');
var manager = require("../../omni-sharp-server/client-manager");
var omnisharp_client_1 = require("omnisharp-client");
var React = require('react');
var SolutionInformation = (function () {
    function SolutionInformation() {
        this.selectedIndex = 0;
        this.solutions = [];
        this.required = true;
        this.title = 'Solution Information';
        this.description = 'Monitors each running solution and offers the ability to start/restart/stop a solution.';
    }
    SolutionInformation.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var solutions = this.setupSolutions();
        this.observe = { solutions: solutions, updates: rx_1.Observable.ofObjectChanges(this) };
        this.disposable.add(manager.activeClient.subscribe(function (model) { return _this.selectedIndex = _.findIndex(manager.activeClients, { index: model.index }); }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:next-solution-status', function () {
            _this.updateSelectedItem(_this.selectedIndex + 1);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:solution-status', function () {
            if (_this.cardDisposable) {
                _this.cardDisposable.dispose();
            }
            else {
                _this.cardDisposable = _this.createSolutionCard();
            }
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:previous-solution-status', function () {
            _this.updateSelectedItem(_this.selectedIndex - 1);
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:stop-server', function () {
            manager.activeClients[_this.selectedIndex].disconnect();
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:start-server', function () {
            manager.activeClients[_this.selectedIndex].connect();
        }));
        this.disposable.add(atom.commands.add("atom-workspace", 'omnisharp-atom:restart-server', function () {
            var client = manager.activeClients[_this.selectedIndex];
            client.state
                .where(function (z) { return z == omnisharp_client_1.DriverState.Disconnected; })
                .take(1)
                .delay(500)
                .subscribe(function () {
                client.connect();
            });
            client.disconnect();
        }));
    };
    SolutionInformation.prototype.updateSelectedItem = function (index) {
        if (index < 0)
            index = this.solutions.length - 1;
        if (index >= this.solutions.length)
            index = 0;
        if (this.selectedIndex !== index)
            this.selectedIndex = index;
        if (this.card) {
            this.card.updateCard({
                model: this.solutions[this.selectedIndex],
                count: this.solutions.length
            });
        }
    };
    SolutionInformation.prototype.setupSolutions = function () {
        var _this = this;
        var solutions = rx_1.Observable.ofArrayChanges(manager.activeClients)
            .map(function () { return manager.activeClients.map(function (z) { return z.model; }); })
            .share();
        this.disposable.add(solutions.subscribe(function (o) {
            _this.solutions = o;
            _this.updateSelectedItem(_this.selectedIndex);
        }));
        return solutions;
    };
    SolutionInformation.prototype.createSolutionCard = function () {
        var _this = this;
        var disposable = new rx_1.CompositeDisposable();
        this.disposable.add(disposable);
        var workspace = atom.views.getView(atom.workspace);
        if (!this.container) {
            var container = this.container = document.createElement("div");
            workspace.appendChild(container);
        }
        if (this.solutions.length) {
            var element = React.render(React.createElement(solution_status_view_1.SolutionStatusCard, {
                model: this.solutions[this.selectedIndex],
                count: this.solutions.length,
                attachTo: '.projects-icon'
            }), this.container);
            this.card = element;
            disposable.add(atom.commands.add("atom-workspace", 'core:cancel', function () {
                disposable.dispose();
                _this.disposable.remove(disposable);
            }));
            disposable.add(rx_1.Disposable.create(function () {
                React.unmountComponentAtNode(_this.container);
                _this.card = null;
                _this.cardDisposable = null;
            }));
        }
        else {
            if (this.cardDisposable) {
                this.cardDisposable.dispose();
            }
            var notice = React.render(React.DOM.div({}, "Solution not loaded!"), this.container);
            disposable.add(rx_1.Disposable.create(function () {
                React.unmountComponentAtNode(_this.container);
                _this.card = null;
                _this.cardDisposable = null;
            }));
        }
        return disposable;
    };
    SolutionInformation.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return SolutionInformation;
})();
exports.solutionInformation = new SolutionInformation;
