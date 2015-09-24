var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var dock_1 = require("../atom/dock");
var test_results_window_1 = require("../views/test-results-window");
var childProcess = require('child_process');
// Using this enum as the Omnisharp one is freaking out.
var TestCommandType;
(function (TestCommandType) {
    TestCommandType[TestCommandType["All"] = 0] = "All";
    TestCommandType[TestCommandType["Fixture"] = 1] = "Fixture";
    TestCommandType[TestCommandType["Single"] = 2] = "Single";
})(TestCommandType || (TestCommandType = {}));
var RunTests = (function () {
    function RunTests() {
        this.testResults = [];
        this.required = true;
        this.title = 'Test Runner';
        this.description = 'Adds support for running tests within atom.';
    }
    RunTests.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        var updated = rx_1.Observable.ofObjectChanges(this);
        var output = rx_1.Observable.ofArrayChanges(this.testResults).map(function (x) { return _this.testResults; });
        this.observe = {
            updated: updated,
            get output() { return output; }
        };
        this.disposable.add(Omni.listener.observeGettestcontext.subscribe(function (data) {
            _this.ensureWindowIsCreated();
            _this.executeTests(data.response);
        }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:run-all-tests', function () {
            _this.makeRequest(TestCommandType.All);
        }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:run-fixture-tests', function () {
            _this.makeRequest(TestCommandType.Fixture);
        }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:run-single-test', function () {
            _this.makeRequest(TestCommandType.Single);
        }));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:run-last-test', function () {
            _this.executeTests(_this.lastRun);
        }));
    };
    RunTests.prototype.dispose = function () {
        this.disposable.dispose();
    };
    RunTests.prototype.makeRequest = function (type) {
        Omni.request(function (client) { return client.gettestcontextPromise({
            Type: type
        }); });
    };
    RunTests.prototype.executeTests = function (response) {
        var _this = this;
        this.testResults.length = 0;
        this.lastRun = response;
        var child = childProcess.exec(response.TestCommand, { cwd: response.Directory });
        child.stdout.on('data', function (data) {
            _this.testResults.push({ message: data, logLevel: '' });
        });
        child.stderr.on('data', function (data) {
            _this.testResults.push({ message: data, logLevel: 'fail' });
        });
        dock_1.dock.selectWindow('test-output');
    };
    RunTests.prototype.ensureWindowIsCreated = function () {
        var _this = this;
        if (!this.window) {
            this.window = new rx_1.CompositeDisposable();
            var windowDisposable = dock_1.dock.addWindow('test-output', 'Test output', test_results_window_1.TestResultsWindow, {
                runTests: this
            }, {
                priority: 2000,
                closeable: true
            }, this.window);
            this.window.add(windowDisposable);
            this.window.add(rx_1.Disposable.create(function () {
                _this.disposable.remove(_this.window);
                _this.window = null;
            }));
            this.disposable.add(this.window);
        }
    };
    return RunTests;
})();
exports.runTests = new RunTests;
