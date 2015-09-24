var _ = require("lodash");
var rx_1 = require("rx");
var jquery_1 = require("jquery");
var filter = require('fuzzaldrin').filter;
var frameworkCache = new Map();
function fetchFrameworkFromGithub(framework) {
    if (frameworkCache.has(framework)) {
        return rx_1.Observable.just(frameworkCache.get(framework));
    }
    // Get the file from github
    var result = jquery_1.ajax("https://raw.githubusercontent.com/OmniSharp/omnisharp-nuget/resources/frameworks/" + framework.toLowerCase() + ".json").then(function (res) { return JSON.parse(res); });
    return rx_1.Observable.fromPromise(result);
}
function makeSuggestion(item, replacementPrefix) {
    var type = 'package';
    return {
        _search: item,
        text: item,
        snippet: item,
        type: type,
        displayText: item,
        replacementPrefix: replacementPrefix,
        className: 'autocomplete-project-json'
    };
}
function makeSuggestion2(item, replacementPrefix) {
    var type = 'version';
    return {
        _search: item,
        text: item,
        snippet: item,
        type: type,
        displayText: item,
        replacementPrefix: replacementPrefix,
        className: 'autocomplete-project-json'
    };
}
var nameRegex = /\/((?:dnx|net)[0-9]{2,3})\/frameworkAssemblies$/;
var versionRegex = /\/((?:dnx|net)[0-9]{2,3})\/frameworkAssemblies\/([a-zA-Z0-9\._]*?)(?:\/version)?$/;
var nugetName = {
    getSuggestions: function (options) {
        var framework = options.path.match(nameRegex)[1];
        return fetchFrameworkFromGithub(framework)
            .map(_.keys)
            .map(function (z) { return z.map(function (x) { return makeSuggestion(x, options.replacementPrefix); }); })
            .map(function (s) { return filter(s, options.prefix, { key: '_search' }); })
            .toPromise();
    },
    fileMatchs: ['project.json'],
    pathMatch: function (path) {
        return !!path.match(nameRegex);
    },
    dispose: function () { }
};
var nugetVersion = {
    getSuggestions: function (options) {
        var match = options.path.match(versionRegex);
        var framework = match[1];
        var name = match[2];
        return fetchFrameworkFromGithub(framework)
            .map(function (x) { return [makeSuggestion(x[name], options.replacementPrefix)]; })
            .toPromise();
    },
    fileMatchs: ['project.json'],
    pathMatch: function (path) {
        return !!path.match(versionRegex);
    },
    dispose: function () { }
};
var providers = [nugetName, nugetVersion];
module.exports = providers;
