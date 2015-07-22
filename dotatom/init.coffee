# Your init script
#
# Atom will evaluate this file each time a new window is opened. It is run
# after packages are loaded/activated and after the previous editor state
# has been restored.
#
# An example hack to log to the console when each text editor is saved.
#
# atom.workspace.observeTextEditors (editor) ->
#   editor.onDidSave ->
#     console.log "Saved! #{editor.getPath()}"

atom.commands.add 'atom-text-editor', 'exit-insert-mode-if-preceded-by-j': (e) ->
  editor = @getModel()
  pos = editor.getCursorBufferPosition()
  range = [pos.traverse([0,-1]), pos]
  lastChar = editor.getTextInBufferRange(range)
  if lastChar != "j"
    e.abortKeyBinding()
  else
    editor.backspace()
    atom.commands.dispatch(e.currentTarget, 'vim-mode:activate-command-mode')
    
atom.commands.add 'atom-text-editor',
  'editor:toggle-current-row-folding': (event) ->
    editor = @getModel()
    bufferRow = editor.bufferPositionForScreenPosition(editor.getCursorScreenPosition()).row
    if editor.isFoldedAtBufferRow(bufferRow)
      editor.unfoldBufferRow(bufferRow)
    else
      editor.foldBufferRow(bufferRow)

atom.commands.add 'atom-text-editor', 'replace-app-constant-to-api': (e) ->
  editor = @getModel()
  selectedText = editor.getSelectedText()
  selectedBufferRange = editor.getSelectedBufferRange()
  
  # multiline option
  regex = /(\s*?)\w*? (\w*) .*?;/m
  
  console.log 'selected text: ' + selectedText
  console.log 'selected buffer range: ' + selectedBufferRange
  editor.scanInBufferRange regex, selectedBufferRange, (result) ->
    console.log 'matched text: ' + result.matchText
    console.log 'match: ' + result.match
    result.replace(result.match[1] + "$data[''] = AppConstant::" + result.match[2] + ";")
