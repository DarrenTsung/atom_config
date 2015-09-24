// Configure rx / Bluebird for long stacks
var rx = require("rx");
var promise = require('bluebird');
rx.Observable.ofObjectChanges = function (obj) {
    if (obj == null) {
        throw new TypeError('object must not be null or undefined.');
    }
    if (typeof Object.observe !== 'function' && typeof Object.unobserve !== 'function') {
        throw new TypeError('Object.observe is not supported on your platform');
    }
    return rx.Observable.create(function (observer) {
        function observerFn(changes) {
            for (var i = 0, len = changes.length; i < len; i++) {
                observer.onNext(changes[i]);
            }
        }
        Object.observe(obj, observerFn);
        return function () {
            Object.unobserve(obj, observerFn);
        };
    });
};
rx.Observable.ofArrayChanges = function (array) {
    if (!Array.isArray(array)) {
        throw new TypeError('Array.observe only accepts arrays.');
    }
    if (typeof Array.observe !== 'function' && typeof Array.unobserve !== 'function') {
        throw new TypeError('Array.observe is not supported on your platform');
    }
    return rx.Observable.create(function (observer) {
        function observerFn(changes) {
            for (var i = 0, len = changes.length; i < len; i++) {
                observer.onNext(changes[i]);
            }
        }
        Array.observe(array, observerFn);
        return function () {
            Array.unobserve(array, observerFn);
        };
    });
};
if (atom.devMode) {
    promise.longStackTraces();
    rx.config.promise = promise;
    rx.config.longStackSupport = true;
}
