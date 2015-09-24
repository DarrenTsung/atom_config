import {CompositeDisposable} from "rx";
import Omni = require('../../omni-sharp-server/omni')
import Changes = require('../services/apply-changes');

class CodeFormat implements OmniSharp.IFeature {
    private disposable: Rx.CompositeDisposable;

    public activate() {
        this.disposable = new CompositeDisposable();
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format',
            () => this.format()));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format-on-semicolon',
            (event) => this.formatOnKeystroke(event, ';')));
        this.disposable.add(Omni.addTextEditorCommand('omnisharp-atom:code-format-on-curly-brace',
            (event) => this.formatOnKeystroke(event, '}')));
    }

    public dispose() {
        this.disposable.dispose();
    }

    public format() {
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            var buffer = editor.getBuffer();
            Omni.request(editor, client => {
                var request = <OmniSharp.Models.FormatRangeRequest>{
                    Line: 0,
                    Column: 0,
                    EndLine: buffer.getLineCount() - 1,
                    EndColumn: 0,
                };

                return client
                    .formatRangePromise(request)
                    .then((data) => Changes.applyChanges(editor, data));
            });
        }
    }

    public formatOnKeystroke(event: Event, char: string): any {
        var editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            editor.insertText(char);

            Omni.request(editor, client => {
                var request = <OmniSharp.Models.FormatAfterKeystrokeRequest>{
                    Character: char
                };

                return client.formatAfterKeystrokePromise(request)
                    .then((data) => Changes.applyChanges(editor, data));
            });
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return false;
    }

    public required = true;
    public title = 'Code Format';
    public description = 'Support for code formatting.';
}
export var codeFormat = new CodeFormat
