var _ = require('lodash');
var Omni = require('../omni-sharp-server/omni');
var rx_1 = require("rx");
var statefulProperties = ['isOff', 'isConnecting', 'isOn', 'isReady', 'isError'];
var WorldModel = (function () {
    function WorldModel() {
    }
    WorldModel.prototype.activate = function () {
        this._disposable = new rx_1.CompositeDisposable();
        this.setupState();
        this.observe = {
            updates: rx_1.Observable.ofObjectChanges(this)
        };
    };
    WorldModel.prototype.setupState = function () {
        var _this = this;
        this._disposable.add(Omni.activeModel
            .subscribe(function (newModel) {
            // Update on change
            _.each(statefulProperties, function (property) { _this[property] = newModel[property]; });
        }));
        this._disposable.add(Omni.activeModel
            .flatMapLatest(function (newModel) {
            return newModel.observe.updates // Track changes to the model
                .buffer(newModel.observe.updates.throttle(100), function () { return rx_1.Observable.timer(100); }) // Group the changes so that we capture all the differences at once.
                .map(function (items) { return _.filter(items, function (item) { return _.contains(statefulProperties, item.name); }); })
                .where(function (z) { return z.length > 0; })
                .map(function (items) { return ({ items: items, newModel: newModel }); });
        })
            .subscribe(function (ctx) {
            var items = ctx.items, newModel = ctx.newModel;
            // Apply the updates if found
            _.each(items, function (item) {
                _this[item.name] = newModel[item.name];
            });
        }));
    };
    WorldModel.prototype.dispose = function () {
        this._disposable.dispose();
    };
    return WorldModel;
})();
var world = new WorldModel();
exports.world = world;
window['world'] = world; //TEMP
