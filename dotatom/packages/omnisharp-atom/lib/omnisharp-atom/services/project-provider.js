var _ = require("lodash");
var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var Manager = require("../../omni-sharp-server/client-manager");
var jquery_1 = require("jquery");
var filter = require('fuzzaldrin').filter;
var cache = new Map();
var versionCache = new Map();
Omni.listener.observePackagesource
    .map(function (z) { return z.response.Sources; })
    .subscribe(function (sources) {
    _.each(sources, function (source) {
        if (!cache.get(source))
            fetchFromGithub(source, "_keys", "").subscribe(function (result) {
                cache.set(source, result);
            });
    });
});
function fetchFromGithub(source, prefix, searchPrefix) {
    // We precache the keys to make this speedy
    if (prefix === "_keys" && cache.has(source)) {
        return rx_1.Observable.just(cache.get(source));
    }
    // If we have a value in the cache, see if the key exists or not.
    if (cache.has(source)) {
        var c = cache.get(source);
        if (!c) {
            return rx_1.Observable.just(c);
        }
        if (!_.any(c.results, function (x) { return x.toLowerCase() === prefix.toLowerCase() + '.'; })) {
            return rx_1.Observable.just({ results: [] });
        }
    }
    // If we have a cached value then the failed value is empty (no need to fall back to the server)
    var failedValue = cache.has(source) && !!cache.get(source) ? { prefix: null, results: [] } : { prefix: null, results: null };
    var realSource = source;
    // This is the same convention used by omnisharp-nuget build tool
    source = _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
    // Get the file from github
    var result = jquery_1.ajax("https://raw.githubusercontent.com/OmniSharp/omnisharp-nuget/resources/resources/" + source + "/" + prefix.toLowerCase() + ".json").then(function (res) { return JSON.parse(res); });
    // The non key files have an object layout
    if (prefix !== "_keys") {
        var sp = searchPrefix.split('.');
        var filePrefix = sp.slice(1, sp.length - 1).join('.').toLowerCase();
        result = result.then(function (value) {
            var k = _.find(cache.get(realSource).results, function (x) { return x.toLowerCase() === prefix.toLowerCase(); });
            if (!filePrefix) {
                return { prefix: k, results: value._keys };
            }
            else {
                var v = _.findKey(value, function (x, key) { return key.toLowerCase() === filePrefix; }), p = k + "." + v;
                return { prefix: k && v && p, results: value[v] || [] };
            }
        });
    }
    else {
        result = result.then(function (results) { return ({ prefix: '', results: results }); });
    }
    // Return the result
    return rx_1.Observable.fromPromise(result).catch(function () { return rx_1.Observable.just(failedValue); });
}
function makeSuggestion(item, path, replacementPrefix) {
    var type = 'package';
    var r = replacementPrefix.split('.');
    var rs = r.slice(0, r.length - 1).join('.');
    if (rs.length)
        rs += '.';
    if (path.length)
        path += '.';
    return {
        _search: item,
        text: "" + path + item,
        snippet: "" + path + item,
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
var nameRegex = /\/?dependencies$/;
var versionRegex = /\/?dependencies\/([a-zA-Z0-9\._]*?)(?:\/version)?$/;
var nugetName = {
    getSuggestions: function (options) {
        var searchTokens = options.replacementPrefix.split('.');
        if (options.replacementPrefix.indexOf('.') > -1) {
            var packagePrefix = options.replacementPrefix.split('.')[0];
        }
        var replacement = searchTokens.slice(0, searchTokens.length - 1).join('.');
        return Manager.getClientForEditor(options.editor)
            .flatMap(function (z) { return rx_1.Observable.from(z.model.packageSources); })
            .flatMap(function (source) {
            // Attempt to get the source from github
            return fetchFromGithub(source, packagePrefix || "_keys", options.replacementPrefix)
                .flatMap(function (z) {
                if (!z) {
                    // fall back to the server if source isn't found
                    console.info("Falling back to server package search for " + source + ".");
                    return Omni.request(function (solution) { return solution.packagesearch({
                        Search: options.replacementPrefix,
                        IncludePrerelease: true,
                        ProjectPath: solution.path,
                        Sources: [source]
                    }); }).map(function (z) { return ({ prefix: '', results: z.Packages.map(function (item) { return item.Id; }) }); });
                }
                else {
                    return rx_1.Observable.just(z);
                }
            });
        })
            .toArray()
            .map(function (z) {
            var prefix = _.find(z, function (z) { return !!z.prefix; });
            var p = prefix ? prefix.prefix : '';
            return _(z.map(function (z) { return z.results; }))
                .flatten()
                .sortBy()
                .unique()
                .map(function (z) {
                return makeSuggestion(z, p, options.replacementPrefix);
            })
                .value();
        })
            .map(function (s) {
            return filter(s, searchTokens[searchTokens.length - 1], { key: '_search' });
        })
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
        if (!match)
            return Promise.resolve([]);
        var name = match[1];
        var o;
        if (versionCache.has(name)) {
            o = versionCache.get(name);
        }
        else {
            o = Manager.getClientForEditor(options.editor)
                .flatMap(function (z) { return rx_1.Observable.from(z.model.packageSources); })
                .filter(function (z) {
                if (cache.has(z)) {
                    // Short out early if the source doesn't even have the given prefix
                    return _.any(cache.get(z).results, function (x) { return _.startsWith(name, x); });
                }
                return true;
            })
                .toArray()
                .flatMap(function (sources) { return Omni.request(function (solution) { return solution.packageversion({
                Id: name,
                IncludePrerelease: true,
                ProjectPath: solution.path,
                Sources: sources
            }); })
                .flatMap(function (z) { return rx_1.Observable.from(z.Versions); })
                .toArray(); })
                .shareReplay(1);
            versionCache.set(name, o);
        }
        return o.take(1)
            .map(function (z) { return z.map(function (x) {
            return makeSuggestion2(x, options.replacementPrefix);
        }); })
            .map(function (s) {
            return filter(s, options.prefix, { key: '_search' });
        })
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
