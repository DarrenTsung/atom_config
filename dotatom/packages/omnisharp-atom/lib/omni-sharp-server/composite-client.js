var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var omnisharp_client_1 = require("omnisharp-client");
var ObservationClient = (function (_super) {
    __extends(ObservationClient, _super);
    function ObservationClient(clients) {
        if (clients === void 0) { clients = []; }
        _super.call(this, clients);
        this.model = {
            codecheck: this.makeMergeObserable(function (client) { return client.model.observe.codecheck; }),
            output: this.makeMergeObserable(function (client) { return client.model.observe.output; }),
            status: this.makeMergeObserable(function (client) { return client.model.observe.status; }),
            updates: this.makeMergeObserable(function (client) { return client.model.observe.updates; }),
            projectAdded: this.makeMergeObserable(function (client) { return client.model.observe.projectAdded; }),
            projectRemoved: this.makeMergeObserable(function (client) { return client.model.observe.projectRemoved; }),
            projectChanged: this.makeMergeObserable(function (client) { return client.model.observe.projectChanged; }),
            projects: this.makeMergeObserable(function (client) { return client.model.observe.projects; })
        };
    }
    return ObservationClient;
})(omnisharp_client_1.OmnisharpObservationClientV2);
exports.ObservationClient = ObservationClient;
var CombinationClient = (function (_super) {
    __extends(CombinationClient, _super);
    function CombinationClient() {
        _super.apply(this, arguments);
    }
    return CombinationClient;
})(omnisharp_client_1.OmnisharpCombinationClientV2);
exports.CombinationClient = CombinationClient;
