var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SpacePen = require('atom-space-pen-views');
var $ = require('jquery');
var OmniSelectListView = (function (_super) {
    __extends(OmniSelectListView, _super);
    function OmniSelectListView(placeholderText) {
        _super.call(this, { placeholderText: placeholderText });
        this.items = [];
        this.setItems([]);
        this.storeFocusedElement();
        this.panel = atom.workspace.addModalPanel({ item: this });
        this.focusFilterEditor();
    }
    OmniSelectListView.prototype.addToList = function (symbols) {
        this.list.empty();
        if (symbols.length > 0) {
            this.setError(null);
            for (var i = 0; i < Math.min(symbols.length, this.maxItems); i++) {
                var item = symbols[i];
                var itemView = $(this.viewForItem(item));
                itemView.data('select-list-item', item);
                this.list.append(itemView);
            }
            this.selectItemView(this.list.find('li:first'));
        }
        else {
        }
    };
    OmniSelectListView.prototype.populateList = function () {
        if (this.items === null) {
            return;
        }
        var filterQuery = this.getFilterQuery();
        if (filterQuery.length >= this.getMinQueryLength()) {
            this.onFilter(filterQuery);
        }
        else {
            this.list.empty();
        }
    };
    OmniSelectListView.prototype.onFilter = function (filter) {
        throw new Error("Subclass must implement an onFilter(filter) method");
    };
    OmniSelectListView.prototype.getMinQueryLength = function () {
        return 0;
    };
    OmniSelectListView.prototype.cancelled = function () {
        this.panel.destroy();
    };
    return OmniSelectListView;
})(SpacePen.SelectListView);
module.exports = OmniSelectListView;
