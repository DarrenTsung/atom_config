var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var OmniSelectListView = require('../services/omni-select-list-view');
var Omni = require('../../omni-sharp-server/omni');
var FindSymbolsView = (function (_super) {
    __extends(FindSymbolsView, _super);
    function FindSymbolsView() {
        _super.call(this, "Find Symbols");
        this.setMaxItems(50);
    }
    FindSymbolsView.prototype.viewForItem = function (item) {
        return '<li>' +
            '<span>' +
            '<img style="margin-right: 0.75em;" height="16px" width="16px" src="atom://omnisharp-atom/styles/icons/autocomplete_' + item.Kind.toLowerCase() + '@3x.png" />' +
            '<span>' + item.Text + '</span>' +
            '</span>' +
            '<br/>' +
            '<span class="filename">' + atom.project.relativizePath(item.FileName)[1] + ':' + item.Line + '</span>' +
            '</li>';
    };
    FindSymbolsView.prototype.getFilterKey = function () {
        return "Text";
    };
    FindSymbolsView.prototype.confirmed = function (item) {
        this.cancel();
        this.hide();
        Omni.navigateTo(item);
        return null;
    };
    FindSymbolsView.prototype.onFilter = function (filter) {
        Omni.request(function (client) {
            return client.findsymbolsPromise({
                Filter: filter
            });
        });
    };
    FindSymbolsView.prototype.getMinQueryLength = function () {
        return 1;
    };
    return FindSymbolsView;
})(OmniSelectListView);
module.exports = FindSymbolsView;
