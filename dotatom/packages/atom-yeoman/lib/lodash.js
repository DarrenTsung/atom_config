var loophole = require("loophole");
// Loophole the loophole...
loophole.Function.prototype = Function.prototype;
/// NOTICE: This is a a dirty stinking hack.
/// To get around an issue in yeoman-generator with their deprectaion logic.
// This is terrible, terrible, terrible, but I see no other way around it.
global.Function = loophole.Function;
var _ = (function () {
    var res;
    loophole.allowUnsafeNewFunction(function () { return res = require('lodash'); });
    return res;
})();
module.exports = _;
