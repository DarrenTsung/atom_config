var Range = require('atom').Range;
var Changes = (function () {
    function Changes() {
    }
    Changes.applyChanges = function (editor, response) {
        if (response.Changes) {
            var buffer = editor.getBuffer();
            var checkpoint = buffer.createCheckpoint();
            response.Changes.forEach(function (change) {
                var range = new Range([change.StartLine, change.StartColumn], [change.EndLine, change.EndColumn]);
                buffer.setTextInRange(range, change.NewText);
            });
            buffer.groupChangesSinceCheckpoint(checkpoint);
        }
        else if (response.Buffer) {
            editor.setText(response.Buffer);
        }
    };
    return Changes;
})();
module.exports = Changes;
