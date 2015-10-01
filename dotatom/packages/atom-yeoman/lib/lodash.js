var loophole = require("loophole");
// Loophole the loophole...
loophole.Function.prototype = Function.prototype;
function allowUnsafe(fn) {
    return loophole.allowUnsafeEval(function () { return loophole.allowUnsafeNewFunction(function () { return fn(); }); });
}
/// NOTICE: This is a a dirty stinking hack.
/// To get around an issue in yeoman-generator with their deprectaion logic.
// This is terrible, terrible, terrible, but I see no other way around it.
global.Function = loophole.Function;
var _ = (function () {
    var res;
    allowUnsafe(function () { return res = require('lodash'); });
    return res;
})();
module.exports = _;
