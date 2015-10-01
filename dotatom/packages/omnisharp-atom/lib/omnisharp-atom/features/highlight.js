var Omni = require('../../omni-sharp-server/omni');
var lodash_1 = require("lodash");
var rx_1 = require("rx");
var AtomGrammar = require(atom.config.resourcePath + "/node_modules/first-mate/lib/grammar.js");
var Range = require('atom').Range;
var DEBOUNCE_TIME = 240;
var Highlight = (function () {
    function Highlight() {
        this.required = false;
        this.title = 'Enhanced Highlighting';
        this.description = 'Enables server based highlighting, which includes support for string interpolation, class names and more.';
        this.default = false;
    }
    Highlight.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.editors = [];
        this.disposable.add(Omni.eachEditor(function (editor, cd) { return _this.setupEditor(editor, cd); }));
        this.disposable.add(isObserveRetokenizing(Omni.activeEditor.take(1)
            .where(function (x) { return !!x; })
            .flatMap(function (editor) { return Omni.listener.observeHighlight
            .where(function (z) { return z.request.FileName == editor.getPath(); })
            .map(function (z) { return ({ editor: editor, request: z.request, response: z.response }); })
            .take(1); }))
            .subscribe(function (_a) {
            var editor = _a.editor, request = _a.request, response = _a.response;
            editor.getGrammar && editor.getGrammar().setResponses(response.Highlights, request.ProjectNames.length > 0);
            editor.displayBuffer.tokenizedBuffer.retokenizeLines();
        }));
        this.disposable.add(isObserveRetokenizing(Omni.listener.observeHighlight
            .map(function (z) { return ({ editor: lodash_1.find(_this.editors, function (editor) { return editor.getPath() === z.request.FileName; }), request: z.request, response: z.response }); })
            .flatMap(function (z) { return Omni.activeEditor.take(1).where(function (x) { return x !== z.editor; }).map(function (x) { return z; }); }))
            .subscribe(function (_a) {
            var editor = _a.editor, request = _a.request, response = _a.response;
            editor.getGrammar && editor.getGrammar().setResponses(response.Highlights, request.ProjectNames.length > 0);
        }));
        this.disposable.add(isEditorObserveRetokenizing(rx_1.Observable.merge(Omni.activeEditor, Omni.activeFramework
            .flatMap(function (z) { return Omni.listener.observeHighlight
            .where(function (x) { return lodash_1.contains(x.request.ProjectNames, z.project.name + "+" + z.framework.ShortName); })
            .map(function (z) { return ({ editor: lodash_1.find(_this.editors, function (editor) { return editor.getPath() === z.request.FileName; }), request: z.request, response: z.response }); })
            .take(1); })
            .flatMap(function (z) { return Omni.activeEditor; }))
            .debounce(DEBOUNCE_TIME)
            .where(function (z) { return !!z; }))
            .subscribe(function (editor) {
            editor.displayBuffer.tokenizedBuffer['silentRetokenizeLines']();
        }));
    };
    Highlight.prototype.dispose = function () {
        this.disposable && this.disposable.dispose();
    };
    Highlight.prototype.setupEditor = function (editor, disposable) {
        var _this = this;
        if (editor['_oldGrammar'] || !editor.getGrammar)
            return;
        this.editors.push(editor);
        this.disposable.add(disposable);
        if (!editor['_oldGrammar'])
            editor['_oldGrammar'] = editor.getGrammar();
        if (!editor['_setGrammar'])
            editor['_setGrammar'] = editor.setGrammar;
        if (!editor.displayBuffer.tokenizedBuffer['_buildTokenizedLineForRowWithText'])
            editor.displayBuffer.tokenizedBuffer['_buildTokenizedLineForRowWithText'] = editor.displayBuffer.tokenizedBuffer.buildTokenizedLineForRowWithText;
        if (!editor.displayBuffer.tokenizedBuffer['_markTokenizationComplete'])
            editor.displayBuffer.tokenizedBuffer['_markTokenizationComplete'] = editor.displayBuffer.tokenizedBuffer.markTokenizationComplete;
        if (!editor.displayBuffer.tokenizedBuffer['_retokenizeLines'])
            editor.displayBuffer.tokenizedBuffer['_retokenizeLines'] = editor.displayBuffer.tokenizedBuffer.retokenizeLines;
        if (!editor.displayBuffer.tokenizedBuffer['_tokenizeInBackground'])
            editor.displayBuffer.tokenizedBuffer['_tokenizeInBackground'] = editor.displayBuffer.tokenizedBuffer.tokenizeInBackground;
        if (!editor.displayBuffer.tokenizedBuffer['_chunkSize'])
            editor.displayBuffer.tokenizedBuffer['chunkSize'] = 20;
        editor.setGrammar = setGrammar;
        editor.setGrammar(editor.getGrammar());
        var grammar = editor.getGrammar();
        editor.displayBuffer.tokenizedBuffer.buildTokenizedLineForRowWithText = function (row) {
            grammar['__row__'] = row;
            return editor.displayBuffer.tokenizedBuffer['_buildTokenizedLineForRowWithText'].apply(this, arguments);
        };
        if (!editor.displayBuffer.tokenizedBuffer.silentRetokenizeLines) {
            editor.displayBuffer.tokenizedBuffer.silentRetokenizeLines = lodash_1.debounce(function () {
                if (grammar.isObserveRetokenizing)
                    grammar.isObserveRetokenizing.onNext(false);
                var event, lastRow;
                lastRow = this.buffer.getLastRow();
                this.tokenizedLines = this.buildPlaceholderTokenizedLinesForRows(0, lastRow);
                this.invalidRows = [];
                if (this.linesToTokenize && this.linesToTokenize.length) {
                    this.invalidateRow(lodash_1.min(this.linesToTokenize));
                }
                else {
                    this.invalidateRow(0);
                }
                this.fullyTokenized = false;
            }, DEBOUNCE_TIME);
        }
        editor.displayBuffer.tokenizedBuffer.markTokenizationComplete = function () {
            if (grammar.isObserveRetokenizing)
                grammar.isObserveRetokenizing.onNext(true);
            return editor.displayBuffer.tokenizedBuffer['_markTokenizationComplete'].apply(this, arguments);
        };
        editor.displayBuffer.tokenizedBuffer.retokenizeLines = function () {
            if (grammar.isObserveRetokenizing)
                grammar.isObserveRetokenizing.onNext(false);
            return editor.displayBuffer.tokenizedBuffer['_retokenizeLines'].apply(this, arguments);
        };
        editor.displayBuffer.tokenizedBuffer.tokenizeInBackground = function () {
            var _this = this;
            if (!this.visible || this.pendingChunk || !this.isAlive())
                return;
            this.pendingChunk = true;
            window.requestAnimationFrame(function () {
                _this.pendingChunk = false;
                if (_this.isAlive() && _this.buffer.isAlive()) {
                    _this.tokenizeNextChunk();
                }
            });
        };
        disposable.add(rx_1.Disposable.create(function () {
            grammar.linesToFetch = [];
            grammar.responses.clear();
            editor.displayBuffer.tokenizedBuffer.retokenizeLines();
            delete editor['_oldGrammar'];
        }));
        this.disposable.add(editor.onDidDestroy(function () {
            lodash_1.pull(_this.editors, editor);
        }));
        var issueRequest = new rx_1.Subject();
        disposable.add(issueRequest
            .debounce(DEBOUNCE_TIME)
            .flatMap(function (z) { return Omni.getProject(editor).map(function (z) { return z.activeFramework.Name === 'all' ? '' : (z.name + '+' + z.activeFramework.ShortName); }).timeout(200, rx_1.Observable.just('')); })
            .flatMapLatest(function (framework) {
            var projects = [];
            if (framework)
                projects = [framework];
            var linesToFetch = lodash_1.unique(grammar.linesToFetch) || [];
            if (!linesToFetch || !linesToFetch.length)
                linesToFetch = [];
            return Omni.request(editor, function (client) { return client.highlight({
                ProjectNames: projects,
                Lines: linesToFetch,
                ExcludeClassifications: [
                    OmniSharp.Models.HighlightClassification.Comment,
                    OmniSharp.Models.HighlightClassification.String,
                    OmniSharp.Models.HighlightClassification.Punctuation,
                    OmniSharp.Models.HighlightClassification.Operator,
                    OmniSharp.Models.HighlightClassification.Keyword
                ]
            }); }).map(function (z) { return ({ projects: projects, response: z }); });
        })
            .subscribe(function (ctx) {
            var response = ctx.response, projects = ctx.projects;
            editor.getGrammar && editor.getGrammar().setResponses(response.Highlights, projects.length > 0);
            editor.displayBuffer.tokenizedBuffer['silentRetokenizeLines']();
        }));
        disposable.add(Omni.getProject(editor)
            .flatMap(function (z) { return z.observe.activeFramework; }).subscribe(function () {
            grammar.linesToFetch = [];
            grammar.responses.clear();
            issueRequest.onNext(true);
        }));
        disposable.add(editor.onDidStopChanging(function () { return issueRequest.onNext(true); }));
        disposable.add(editor.onDidSave(function () {
            grammar.linesToFetch = [];
            issueRequest.onNext(true);
        }));
        disposable.add(Omni.whenEditorConnected(editor).delay(1000).subscribe(function () {
            issueRequest.onNext(true);
        }));
    };
    return Highlight;
})();
function isObserveRetokenizing(observable) {
    return observable
        .where(function (z) { return !!z && !!z.editor && !!z.editor.getGrammar; })
        .where(function (z) { return !!z.editor.getGrammar().isObserveRetokenizing; })
        .flatMap(function (z) { return z.editor.getGrammar().isObserveRetokenizing
        .where(function (z) { return !!z; })
        .take(1)
        .map(function (x) { return z; }); });
}
function isEditorObserveRetokenizing(observable) {
    return observable.where(function (z) { return !!z && !!z.getGrammar; })
        .where(function (z) { return !!z.getGrammar().isObserveRetokenizing; })
        .flatMap(function (z) { return z.getGrammar().isObserveRetokenizing
        .where(function (z) { return !!z; })
        .take(1)
        .map(function (x) { return z; }); });
}
var HighlightClassification;
(function (HighlightClassification) {
    HighlightClassification[HighlightClassification["Name"] = 1] = "Name";
    HighlightClassification[HighlightClassification["Comment"] = 2] = "Comment";
    HighlightClassification[HighlightClassification["String"] = 3] = "String";
    HighlightClassification[HighlightClassification["Operator"] = 4] = "Operator";
    HighlightClassification[HighlightClassification["Punctuation"] = 5] = "Punctuation";
    HighlightClassification[HighlightClassification["Keyword"] = 6] = "Keyword";
    HighlightClassification[HighlightClassification["Number"] = 7] = "Number";
    HighlightClassification[HighlightClassification["Identifier"] = 8] = "Identifier";
    HighlightClassification[HighlightClassification["PreprocessorKeyword"] = 9] = "PreprocessorKeyword";
    HighlightClassification[HighlightClassification["ExcludedCode"] = 10] = "ExcludedCode";
})(HighlightClassification || (HighlightClassification = {}));
lodash_1.set(global, 'OmniSharp.Models.HighlightClassification', HighlightClassification);
function Grammar(editor, base) {
    var _this = this;
    var isObserveRetokenizing = this.isObserveRetokenizing = new rx_1.ReplaySubject(1);
    this.editor = editor;
    var responses = new Map();
    this.linesToFetch = [];
    this.linesToTokenize = [];
    this.activeFramework = {};
    Object.defineProperty(this, 'responses', {
        writable: false,
        value: responses
    });
    var disposable = editor.getBuffer().preemptDidChange(function (e) {
        var oldRange = e.oldRange, newRange = e.newRange, start = oldRange.start.row, delta = newRange.end.row - oldRange.end.row;
        start = start - 5;
        if (start < 0)
            start = 0;
        var end = editor.buffer.getLineCount() - 1;
        var lines = lodash_1.range(start, end + 1);
        if (!responses.keys().next().done) {
            (_a = _this.linesToFetch).push.apply(_a, lines);
        }
        if (lines.length === 1) {
            var responseLine = responses.get(lines[0]);
            if (responseLine) {
                var oldFrom = oldRange.start.column, oldTo = oldRange.end.column, newFrom = newRange.start.column, newTo = newRange.end.column, oldDistance = oldTo - oldFrom, newDistance = newTo - newFrom;
                //responses.delete(lines[0]);
                lodash_1.remove(responseLine, function (span) {
                    if (span.StartLine < lines[0]) {
                        return true;
                    }
                    if (span.StartColumn >= oldFrom || span.EndColumn >= oldFrom) {
                        return true;
                    }
                    if (span.StartColumn >= newFrom || span.EndColumn >= newFrom) {
                        return true;
                    }
                    return false;
                });
            }
        }
        else {
            lodash_1.each(lines, function (line) { responses.delete(line); });
        }
        if (delta > 0) {
            // New line
            var count = editor.getLineCount();
            for (var i = count - 1; i > end; i--) {
                if (responses.has(i)) {
                    responses.set(i + delta, responses.get(i));
                    responses.delete(i);
                }
            }
        }
        else if (delta < 0) {
            // Removed line
            var count = editor.getLineCount();
            var absDelta = Math.abs(delta);
            for (var i = end; i < count; i++) {
                if (responses.has(i + absDelta)) {
                    responses.set(i, responses.get(i + absDelta));
                    responses.delete(i + absDelta);
                }
            }
        }
        var _a;
    });
    this.setResponses = function (value, enableExcludeCode) {
        var results = lodash_1.chain(value).chain();
        var groupedItems = results.map(function (highlight) { return lodash_1.range(highlight.StartLine, highlight.EndLine + 1)
            .map(function (line) { return ({ line: line, highlight: highlight }); }); })
            .flatten()
            .groupBy(function (z) { return z.line; })
            .value();
        lodash_1.each(groupedItems, function (item, key) {
            var k = +key, mappedItem = item.map(function (x) { return x.highlight; });
            if (!enableExcludeCode || lodash_1.any(mappedItem, function (i) { return i.Kind === 'preprocessor keyword'; }) && lodash_1.all(mappedItem, function (i) { return i.Kind === "excluded code" || i.Kind === 'preprocessor keyword'; })) {
                mappedItem = mappedItem.filter(function (z) { return z.Kind !== "excluded code"; });
            }
            if (!responses.has(k)) {
                responses.set(k, mappedItem);
                _this.linesToTokenize.push(k);
            }
            else {
                var responseLine = responses.get(k);
                if (responseLine.length !== mappedItem.length || lodash_1.any(responseLine, function (l, i) { return !lodash_1.isEqual(l, mappedItem[i]); })) {
                    responses.set(k, mappedItem);
                    _this.linesToTokenize.push(k);
                }
            }
        });
    };
}
lodash_1.extend(Grammar.prototype, AtomGrammar.prototype);
Grammar.prototype.omnisharp = true;
Grammar.prototype.tokenizeLine = function (line, ruleStack, firstLine) {
    if (firstLine === void 0) { firstLine = false; }
    var baseResult = AtomGrammar.prototype.tokenizeLine.call(this, line, ruleStack, firstLine);
    var tags;
    if (this.responses) {
        var row = this['__row__'];
        if (!this.responses.has(row))
            return baseResult;
        var highlights = this.responses.get(row);
        // Excluded code blows away any other formatting, otherwise we get into a very weird state.
        if (highlights[0] && highlights[0].Kind === "excluded code") {
            tags = [line.length];
            getAtomStyleForToken(tags, highlights[0], 0, tags.length - 1, line);
            baseResult.ruleStack = [baseResult.ruleStack[0]];
        }
        else {
            tags = this.getCsTokensForLine(highlights, line, row, ruleStack, firstLine, baseResult.tags);
        }
        baseResult.tags = tags;
    }
    return baseResult;
};
Grammar.prototype.getCsTokensForLine = function (highlights, line, row, ruleStack, firstLine, tags) {
    ruleStack = [{ rule: this.getInitialRule() }];
    var originalTags = tags.slice();
    lodash_1.each(highlights, function (highlight) {
        var start = highlight.StartColumn - 1;
        var end = highlight.EndColumn - 1;
        if (highlight.EndLine > highlight.StartLine && highlight.StartColumn === 0 && highlight.EndColumn === 0) {
            getAtomStyleForToken(tags, highlight, 0, tags.length - 1, line);
            return;
        }
        var distance = -1;
        var index = -1;
        for (var i = 0; i < tags.length; i++) {
            if (tags[i] > 0) {
                if (distance + tags[i] > start) {
                    index = i;
                    break;
                }
                distance += tags[i];
            }
        }
        var str = line.substring(start, end);
        var size = end - start;
        if (tags[index] >= size) {
            var values;
            if (distance === start) {
                values = [size, tags[index] - size];
            }
            else {
                var prev = start - distance;
                var next = tags[index] - size - prev;
                if (next > 0)
                    values = [prev, size, tags[index] - size - prev];
                else
                    values = [prev, size];
            }
            tags.splice.apply(tags, [index, 1].concat(values));
            if (prev)
                index = index + 1;
            getAtomStyleForToken(tags, highlight, index, index, str);
        }
        else if (tags[index] < size) {
            var backtrackIndex = index;
            var backtrackDistance = 0;
            for (var i = backtrackIndex; i >= 0; i--) {
                if (tags[i] > 0) {
                    if (backtrackDistance >= size) {
                        backtrackIndex = i;
                        break;
                    }
                    backtrackDistance += tags[i];
                }
                else if (tags[i] % 2 === 0) {
                    if (backtrackDistance >= size) {
                        backtrackIndex = i + 1;
                        break;
                    }
                }
            }
            if (i === -1) {
                backtrackIndex = 0;
            }
            var forwardtrackIndex = index;
            for (var i = index + 1; i < tags.length; i++) {
                if (tags[i] > 0 || tags[i] % 2 === -1) {
                    forwardtrackIndex = i - 1;
                    break;
                }
                // Handles case where there is a closing tag
                // but no opening tag here.
                if (tags[i] % 2 === 0) {
                    var openFound = false;
                    for (var h = i; h >= 0; h--) {
                        if (tags[h] === tags[i] + 1) {
                            openFound = true;
                            break;
                        }
                    }
                    if (!openFound) {
                        forwardtrackIndex = i - 1;
                        break;
                    }
                }
            }
            if (i === tags.length) {
                forwardtrackIndex = tags.length - 1;
            }
            getAtomStyleForToken(tags, highlight, backtrackIndex, forwardtrackIndex, str);
        }
    });
    return tags;
};
var getIdForScope = (function () {
    var ids = {};
    var csharpGrammar;
    var cb = function () {
        csharpGrammar = lodash_1.find(atom.grammars.getGrammars(), function (grammar) { return grammar.name === 'C#'; });
        if (!csharpGrammar)
            return;
        lodash_1.each(csharpGrammar.registry.scopesById, function (value, key) { ids[value] = +key; });
    };
    cb();
    if (!csharpGrammar) {
        var sub = atom.grammars.onDidAddGrammar(function () {
            cb();
            if (csharpGrammar)
                sub.dispose();
        });
    }
    var method = function (scope) {
        if (!ids[scope])
            ids[scope] = csharpGrammar.registry.startIdForScope(scope);
        return +ids[scope];
    };
    method.end = function (scope) { return +scope - 1; };
    return method;
})();
/// NOTE: best way I have found for these is to just look at theme "less" files
// Alternatively just inspect the token for a .cs file
function getAtomStyleForToken(tags, token, index, indexEnd, str) {
    var previousScopes = [];
    for (var i = index - 1; i >= 0; i--) {
        if (tags[i] > 0)
            break;
        previousScopes.push(tags[i]);
    }
    var replacements = [];
    var opens = [];
    var closes = [];
    // Scan for any unclosed or unopened tags
    for (var i = index; i < indexEnd; i++) {
        if (tags[i] > 0)
            continue;
        if (tags[i] % 2 === 0) {
            var openIndex = lodash_1.findIndex(opens, function (x) { return x.tag == (tags[i] + 1); });
            if (openIndex > -1) {
                opens.splice(openIndex, 1);
            }
            else {
                closes.push({ tag: tags[i], index: i });
            }
        }
        else {
            opens.unshift({ tag: tags[i], index: i });
        }
    }
    var unfullfilled = lodash_1.sortBy(opens.concat(closes), function (x) { return x.index; });
    var internalIndex = index;
    for (var i = 0; i < unfullfilled.length; i++) {
        var v = unfullfilled[i];
        replacements.unshift({
            start: internalIndex,
            end: v.index - 1,
            replacement: tags.slice(internalIndex, v.index)
        });
        internalIndex = v.index + 1;
    }
    if (replacements.length === 0) {
        replacements.unshift({
            start: index,
            end: indexEnd,
            replacement: tags.slice(index, indexEnd + 1)
        });
    }
    else {
        replacements.unshift({
            start: internalIndex,
            end: indexEnd,
            replacement: tags.slice(internalIndex, indexEnd + 1)
        });
    }
    function add(scope) {
        var id = getIdForScope(scope);
        if (id === -1)
            return;
        if (!lodash_1.any(previousScopes, function (z) { return z === id; })) {
            previousScopes.push(id);
        }
        lodash_1.each(replacements, function (ctx) {
            var replacement = ctx.replacement;
            replacement.unshift(id);
            replacement.push(getIdForScope.end(id));
        });
    }
    switch (token.Kind) {
        case "number":
            add('constant.numeric.source.cs');
            break;
        case "struct name":
            add('support.constant.numeric.identifier.struct.source.cs');
            break;
        case "enum name":
            add('support.constant.numeric.identifier.enum.source.cs');
            break;
        case "identifier":
            add('identifier.source.cs');
            break;
        case "class name":
            add('support.class.type.identifier.source.cs');
            break;
        case "delegate name":
            add('support.class.type.identifier.delegate.source.cs');
            break;
        case "interface name":
            add('support.class.type.identifier.interface.source.cs');
            break;
        case "preprocessor keyword":
            add('constant.other.symbo.source.csl');
            break;
        case "excluded code":
            add('comment.block.source.cs');
            break;
        default:
            console.log("unhandled Kind " + token.Kind);
            break;
    }
    lodash_1.each(replacements, function (ctx) {
        var replacement = ctx.replacement, end = ctx.end, start = ctx.start;
        tags.splice.apply(tags, [start, end - start + 1].concat(replacement));
    });
}
function setGrammar(grammar) {
    if (!grammar['omnisharp'] && (grammar.name === 'C#' || grammar.name === 'C# Script File')) {
        var newGrammar = new Grammar(this, grammar);
        lodash_1.each(grammar, function (x, i) { return lodash_1.has(grammar, i) && (newGrammar[i] = x); });
        grammar = newGrammar;
    }
    return this._setGrammar(grammar);
}
exports.enhancedHighlighting = new Highlight;
