var _ = require('lodash');
var Omni = require('../../omni-sharp-server/omni');
var rx_1 = require("rx");
var path = require('path');
var $ = require('jquery');
var NotificationHandler = (function () {
    function NotificationHandler() {
        this.required = true;
        this.title = 'Package Restore Notifications';
        this.description = 'Adds support to show package restore progress, when the server initiates a restore operation.';
    }
    NotificationHandler.prototype.activate = function () {
        this.disposable = new rx_1.CompositeDisposable();
        this.packageRestoreNotification = new PackageRestoreNotification();
        this.disposable.add(Omni.listener.packageRestoreStarted.subscribe(this.packageRestoreNotification.handlePackageRestoreStarted));
        this.disposable.add(Omni.listener.packageRestoreFinished.subscribe(this.packageRestoreNotification.handlePackageRestoreFinished));
        this.disposable.add(Omni.listener.unresolvedDependencies.subscribe(this.packageRestoreNotification.handleUnresolvedDependencies));
        this.disposable.add(Omni.listener.events
            .where(function (z) { return z.Event === "log"; })
            .where(function (z) { return z.Body.Name === "OmniSharp.AspNet5.PackagesRestoreTool"; })
            .where(function (z) { return z.Body.Message.startsWith('Installing'); })
            .subscribe(this.packageRestoreNotification.handleEvents));
    };
    NotificationHandler.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return NotificationHandler;
})();
var PackageRestoreNotification = (function () {
    function PackageRestoreNotification() {
        var _this = this;
        this.handlePackageRestoreStarted = function (event) {
            // Count how many of these we get so we know when to dismiss the notification
            _this.packageRestoreStarted++;
            if (_this.notification.isDismissed()) {
                _this.notification.show('Package restore started', "Starting..");
            }
        };
        this.handleUnresolvedDependencies = function (event) {
            // Sometimes UnresolvedDependencies event is sent before PackageRestoreStarted
            if (_this.notification.isDismissed()) {
                _this.notification.show('Package restore started', "Starting..");
            }
            var projectName = _this.findProjectNameFromFileName(event.FileName);
            // Client gets more than one of each UnresolvedDependencies events for each project
            // Don't show multiple instances of a project in the notification
            if (!_.any(_this.knownProjects, function (knownProject) { return knownProject == projectName; })) {
                _this.knownProjects.push(projectName);
                _this.notification.addDetail("Unresolved dependencies for " + projectName + ":", true);
                if (event.UnresolvedDependencies) {
                    event.UnresolvedDependencies.forEach(function (dep) {
                        _this.notification.addDetail(" - " + dep.Name + " " + dep.Version);
                    });
                }
            }
        };
        this.handlePackageRestoreFinished = function (event) {
            // Count how many of these we get so we know when to dismiss the notification
            _this.packageRestoreFinished++;
            if (_this.packageRestoreStarted === _this.packageRestoreFinished) {
                _this.notification.setSuccessfulAndDismiss('Package restore finished.');
                _this.packageRestoreStarted = 0;
                _this.packageRestoreFinished = 0;
                _this.knownProjects = [];
            }
        };
        this.handleEvents = function (event) {
            _this.setPackageInstalled(event.Body.Message);
        };
        this.notification = new OmniNotification();
        this.packageRestoreStarted = 0;
        this.packageRestoreFinished = 0;
        this.knownProjects = [];
    }
    PackageRestoreNotification.prototype.findProjectNameFromFileName = function (fileName) {
        var split = fileName.split(path.sep);
        var projectName = split[split.length - 2];
        return projectName;
    };
    PackageRestoreNotification.prototype.setPackageInstalled = function (message) {
        var match = message.match(/Installing ([a-zA-Z.]*) ([\D?\d?.?-?]*)/);
        var detailLines = this.notification.getDetailElement().children('.line');
        if (!match || match.length < 3)
            return;
        _.forEach(detailLines, function (line) {
            if (line.textContent.startsWith(" - " + match[1] + " ")) {
                line.textContent = "Installed " + match[1] + " " + match[2];
            }
        });
    };
    return PackageRestoreNotification;
})();
var OmniNotification = (function () {
    function OmniNotification() {
        this.dismissed = true;
    }
    OmniNotification.prototype.addDetail = function (detail, newline) {
        var details = this.getDetailElement();
        if (!detail)
            return;
        if (newline)
            details.append('<br />');
        details.append("<div class=\"line\">" + detail + "</div>");
    };
    OmniNotification.prototype.show = function (message, detail) {
        var _this = this;
        this.atomNotification = atom.notifications.addInfo(message, { detail: detail, dismissable: true });
        this.dismissed = false;
        this.atomNotification.onDidDismiss(function (notification) {
            _this.dismissed = true;
            _this.isBeingDismissed = false;
        });
    };
    OmniNotification.prototype.setSuccessfulAndDismiss = function (message) {
        var _this = this;
        if (this.isBeingDismissed)
            return;
        this.addDetail(message, true);
        var domNotification = $(atom.views.getView(this.atomNotification));
        domNotification.removeClass('info');
        domNotification.removeClass('icon-info');
        domNotification.addClass('success');
        domNotification.addClass('icon-check');
        this.isBeingDismissed = true;
        setTimeout(function () { _this.dismiss(); }, 2000);
    };
    OmniNotification.prototype.isDismissed = function () {
        return this.dismissed;
    };
    OmniNotification.prototype.dismiss = function () {
        this.atomNotification.dismiss();
    };
    OmniNotification.prototype.getDetailElement = function () {
        return this.getFromDom($(atom.views.getView(this.atomNotification)), '.content .detail .detail-content');
    };
    OmniNotification.prototype.getFromDom = function (element, selector) {
        var el = element[0];
        if (!el)
            return;
        var found = el.querySelectorAll(selector);
        return $(found[0]);
    };
    return OmniNotification;
})();
exports.notificationHandler = new NotificationHandler;
