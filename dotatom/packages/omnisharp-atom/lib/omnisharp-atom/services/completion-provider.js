var Omni = require('../../omni-sharp-server/omni');
var _ = require('lodash');
var rx_1 = require('rx');
var filter = require('fuzzaldrin').filter;
function calcuateMovement(previous, current) {
    if (!current)
        return { reset: true, current: current, previous: null };
    // If the row changes we moved lines, we should refetch the completions
    // (Is it possible it will be the same set?)
    var row = Math.abs(current.bufferPosition.row - previous.bufferPosition.row) > 0;
    // If the column jumped, lets get them again to be safe.
    var column = Math.abs(current.bufferPosition.column - previous.bufferPosition.column) > 3;
    return { reset: row || column || false, previous: previous, current: current };
}
var autoCompleteOptions = {
    WordToComplete: '',
    WantDocumentationForEveryCompletionResult: false,
    WantKind: true,
    WantSnippet: true,
    WantReturnType: true
};
var _disposable;
var _initialized = false;
var _useIcons;
var _useLeftLabelColumnForSuggestions;
var previous;
var results;
var setupSubscriptions = function () {
    if (_initialized)
        return;
    var disposable = _disposable = new rx_1.CompositeDisposable();
    // Clear when auto-complete is opening.
    // TODO: Update atom typings
    disposable.add(atom.commands.onWillDispatch(function (event) {
        if (event.type === "autocomplete-plus:activate" || event.type === "autocomplete-plus:confirm" || event.type === "autocomplete-plus:cancel") {
            results = null;
        }
    }));
    // TODO: Dispose of these when not needed
    disposable.add(atom.config.observe('omnisharp-atom.useIcons', function (value) {
        _useIcons = value;
    }));
    disposable.add(atom.config.observe('omnisharp-atom.useLeftLabelColumnForSuggestions', function (value) {
        _useLeftLabelColumnForSuggestions = value;
    }));
    _initialized = true;
};
function makeSuggestion(item) {
    var description, leftLabel, iconHTML, type;
    if (_useLeftLabelColumnForSuggestions == true) {
        description = item.RequiredNamespaceImport;
        leftLabel = item.ReturnType;
    }
    else {
        description = renderReturnType(item.ReturnType);
        leftLabel = '';
    }
    if (_useIcons == true) {
        iconHTML = renderIcon(item);
        type = item.Kind;
    }
    else {
        iconHTML = null;
        type = item.Kind.toLowerCase();
    }
    return {
        _search: item.CompletionText,
        snippet: item.Snippet,
        type: type,
        iconHTML: iconHTML,
        displayText: item.DisplayText,
        className: 'autocomplete-omnisharp-atom',
        description: description,
        leftLabel: leftLabel
    };
}
function renderReturnType(returnType) {
    if (returnType === null) {
        return;
    }
    return "Returns: " + returnType;
}
function renderIcon(item) {
    // todo: move additional styling to css
    return '<img height="16px" width="16px" src="atom://omnisharp-atom/styles/icons/autocomplete_' + item.Kind.toLowerCase() + '@3x.png" /> ';
}
function getSuggestions(options) {
    if (!_initialized)
        setupSubscriptions();
    if (results && previous && calcuateMovement(previous, options).reset) {
        results = null;
    }
    if (results && options.prefix === "." || (options.prefix && !_.trim(options.prefix)) || !options.prefix || options.activatedManually) {
        results = null;
    }
    previous = options;
    var buffer = options.editor.getBuffer();
    var end = options.bufferPosition.column;
    var data = buffer.getLines()[options.bufferPosition.row].substring(0, end + 1);
    var lastCharacterTyped = data[end - 1];
    if (!/[A-Z_0-9.]+/i.test(lastCharacterTyped)) {
        return;
    }
    var search = options.prefix;
    if (search === ".")
        search = "";
    if (!results)
        results = Omni.request(function (client) { return client.autocomplete(_.clone(autoCompleteOptions)); }).toPromise();
    var p = results;
    if (search)
        p = p.then(function (s) { return filter(s, search, { key: 'CompletionText' }); });
    return p.then(function (response) { return response.map(function (s) { return makeSuggestion(s); }); });
}
function onDidInsertSuggestion(editor, triggerPosition, suggestion) {
    results = null;
}
function dispose() {
    if (_disposable)
        _disposable.dispose();
    _disposable = null;
    _initialized = false;
}
exports.CompletionProvider = {
    selector: '.source.cs, .source.csx',
    disableForSelector: 'source.cs .comment',
    inclusionPriority: 1,
    suggestionPriority: 10,
    excludeLowerPriority: true,
    getSuggestions: getSuggestions,
    onDidInsertSuggestion: onDidInsertSuggestion,
    dispose: dispose
};
