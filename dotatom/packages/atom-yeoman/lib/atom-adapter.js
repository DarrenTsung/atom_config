var ListView = require('./prompts/list-view');
var TextViews = require('./prompts/text-view');
var CheckboxView = require("./prompts/checkbox-view");
var _ = require('./lodash');
var logger = require('./logger');
var AtomAdapter = (function () {
    function AtomAdapter() {
        this.answers = {};
        this.log = logger();
        this.messages = this.log.messages;
    }
    AtomAdapter.prototype.prompt = function (questions, callback) {
        //this.answers = {};
        this.questions = questions.concat();
        this.callback = callback;
        console.log(questions);
        this.runNextQuestion();
    };
    AtomAdapter.prototype.runNextQuestion = function () {
        var _this = this;
        if (!this.questions.length) {
            return this.callback(this.answers);
        }
        var currentQuestion = this.questions.shift();
        if (currentQuestion.type === "list" || currentQuestion.type === "rawlist" || currentQuestion.type === "expand") {
            // TODO: Make a real controls for both raw list and expand? Is it needed?
            new ListView(currentQuestion, function (answer) { return _this.saveAnswer(currentQuestion.name, answer); }).show();
        }
        else if (currentQuestion.type === "checkbox") {
            new CheckboxView(currentQuestion, function (answer) { return _this.saveAnswer(currentQuestion.name, answer); }).show();
        }
        else if (currentQuestion.type === "confirm") {
            new TextViews.ConfirmView(currentQuestion, function (answer) { return _this.saveAnswer(currentQuestion.name, _.trim(answer) || ''); }).show();
        }
        else if (_.isUndefined(currentQuestion.type) || currentQuestion.type === "input") {
            new TextViews.TextView(currentQuestion, function (answer) { return _this.saveAnswer(currentQuestion.name, answer); }).show();
        }
        else {
            throw new Error(currentQuestion.type + ' not supported yet.');
        }
    };
    AtomAdapter.prototype.saveAnswer = function (name, answer) {
        this.answers[name] = answer;
        this.runNextQuestion();
    };
    AtomAdapter.prototype.diff = function (actual, expected) {
        throw new Error('need to add diff support');
    };
    return AtomAdapter;
})();
module.exports = AtomAdapter;
