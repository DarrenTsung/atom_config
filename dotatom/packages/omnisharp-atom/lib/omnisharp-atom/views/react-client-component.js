var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var rx_1 = require("rx");
var React = require('react');
var ReactClientComponent = (function (_super) {
    __extends(ReactClientComponent, _super);
    function ReactClientComponent(props, context) {
        _super.call(this, props, context);
        this.disposable = new rx_1.CompositeDisposable();
    }
    ReactClientComponent.prototype.componentWillMount = function () {
        this.disposable = new rx_1.CompositeDisposable();
    };
    ReactClientComponent.prototype.componentDidMount = function () { };
    ReactClientComponent.prototype.componentWillUnmount = function () {
        this.disposable.dispose();
    };
    return ReactClientComponent;
})(React.Component);
exports.ReactClientComponent = ReactClientComponent;
