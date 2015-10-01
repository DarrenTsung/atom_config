var Omni = require('../../omni-sharp-server/omni');
var Range = require('atom').Range;
var _ = require('lodash');
var rx_1 = require("rx");
var code_check_1 = require("../features/code-check");
function getWordAt(str, pos) {
    var wordLocation = {
        start: pos,
        end: pos
    };
    if (str === undefined) {
        return wordLocation;
    }
    while (pos < str.length && /\W/.test(str[pos])) {
        ++pos;
    }
    var left = str.slice(0, pos + 1).search(/\W(?!.*\W)/);
    var right = str.slice(pos).search(/(\W|$)/);
    wordLocation.start = left + 1;
    wordLocation.end = wordLocation.start + right;
    return wordLocation;
}
function mapValues(editor, error) {
    var line = error.Line;
    var column = error.Column;
    var text = editor.lineTextForBufferRow(line);
    var wordLocation = getWordAt(text, column);
    var level = error.LogLevel.toLowerCase();
    return {
        type: level,
        text: error.Text + " [" + Omni.getFrameworks(error.Projects) + "] ",
        filePath: editor.getPath(),
        line: line + 1,
        col: column + 1,
        range: new Range([line, wordLocation.start], [line, wordLocation.end])
    };
}
function showLinter() {
    _.each(document.querySelectorAll('linter-bottom-tab'), function (element) { return element.style.display = ''; });
    _.each(document.querySelectorAll('linter-bottom-status'), function (element) { return element.style.display = ''; });
    var panel = document.querySelector('linter-panel');
    if (panel)
        panel.style.display = '';
}
function hideLinter() {
    _.each(document.querySelectorAll('linter-bottom-tab'), function (element) { return element.style.display = 'none'; });
    _.each(document.querySelectorAll('linter-bottom-status'), function (element) { return element.style.display = 'none'; });
    var panel = document.querySelector('linter-panel');
    if (panel)
        panel.style.display = 'none';
}
function init() {
    var disposable = new rx_1.CompositeDisposable();
    var cd;
    disposable.add(atom.config.observe('omnisharp-atom.hideLinterInterface', function (hidden) {
        if (hidden) {
            cd = new rx_1.CompositeDisposable();
            disposable.add(cd);
            // show linter buttons
            cd.add(Omni.activeEditor
                .where(function (z) { return !z; })
                .subscribe(showLinter));
            // hide linter buttons
            cd.add(Omni.activeEditor
                .where(function (z) { return !!z; })
                .subscribe(hideLinter));
        }
        else {
            if (cd) {
                disposable.remove(cd);
                cd.dispose();
            }
            showLinter();
        }
    }));
    return disposable;
}
exports.init = init;
exports.provider = [
    {
        grammarScopes: ['source.cs'],
        scope: 'file',
        lintOnFly: true,
        lint: function (editor) {
            if (!_.contains(Omni.validGammarNames, editor.getGrammar().name))
                return Promise.resolve([]);
            return code_check_1.codeCheck.doCodeCheck(editor)
                .flatMap(function (x) { return x; })
                .where(function (z) { return z.LogLevel !== "Hidden"; })
                .map(function (error) { return mapValues(editor, error); })
                .toArray()
                .toPromise();
        }
    }, {
        grammarScopes: ['source.cs'],
        scope: 'project',
        lintOnFly: false,
        lint: function (editor) {
            if (!_.contains(Omni.validGammarNames, editor.getGrammar().name))
                return Promise.resolve([]);
            return Omni.activeModel
                .flatMap(function (x) { return rx_1.Observable.from(x.diagnostics); })
                .where(function (z) { return z.LogLevel != "Hidden"; })
                .map(function (error) { return mapValues(editor, error); })
                .toArray()
                .toPromise();
        }
    }
];
