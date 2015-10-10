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



# With the new updated version of the atom editor, this no longer needs to exist.
# Godspeed.
#
# atom.commands.add 'atom-text-editor', 'exit-insert-mode-if-preceded-by-j': (e) ->
#   editor = @getModel()
#   pos = editor.getCursorBufferPosition()
#   range = [pos.traverse([0,-1]), pos]
#   lastChar = editor.getTextInBufferRange(range)
#   if lastChar != "j"
#     e.abortKeyBinding()
#   else
#     editor.backspace()
#     atom.commands.dispatch(e.currentTarget, 'vim-mode:activate-command-mode')
{File} = require 'atom'
    
atom.commands.add 'atom-text-editor',
  'editor:toggle-current-row-folding': (event) ->
    editor = @getModel()
    bufferRow = editor.bufferPositionForScreenPosition(editor.getCursorScreenPosition()).row
    if editor.isFoldedAtBufferRow(bufferRow)
      editor.unfoldBufferRow(bufferRow)
    else
      editor.foldBufferRow(bufferRow)

#pragma mark - Storm8
atom.commands.add 'atom-text-editor', 'replace-app-constant-to-api': (e) ->
  editor = @getModel()
  selectedText = editor.getSelectedText()
  selectedBufferRange = editor.getSelectedBufferRange()
  
  convertToVariableName = ((appConstantName) -> 
    # lowercase the first word
    variableName = appConstantName.replace(/[^\_]*/, (text) ->
      text.toLowerCase()
    )
    # camelcase the rest of the words
    variableName = variableName.replace(/\_\w[^\_]*/g, (text) ->
      variable = text[1].toUpperCase()
      if (text.length > 2)
        variable += text[2..text.length - 1].toLowerCase()
      variable
    )
    variableName
  )
  
  # replace all
  # const APP_CONSTANT_NAME = ....;
  # with
  # $data['appConstantName'] = AppConstant::APP_CONSTANT_NAME
  regex = /[^;]*?(\s*)const\b (\w*)\b .*?;/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    appConstantName = match[2]
    variableName = convertToVariableName(appConstantName)
    replace(match[1] + "$data['" + variableName + "'] = AppConstant::" + appConstantName + ";")
  )
    
  # replace all
  # public static $APP_CONSTANT_NAME = ....;
  # with
  # $data['appConstantName'] = AppConstant::$APP_CONSTANT_NAME
  regex = /[^;]*?^(\s*)public static \$(\w*) =[\s\S]*?;/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    appConstantName = match[2]
    variableName = convertToVariableName(appConstantName)
    replace(match[1] + "$data['" + variableName + "'] = AppConstant::$" + appConstantName + ";")
  )

atom.commands.add 'atom-text-editor', 'replace-api-to-client-app-constant': (e) ->
  editor = @getModel()
  selectedText = editor.getSelectedText()
  selectedBufferRange = editor.getSelectedBufferRange()
  
  regex = /.*'(.*)'.*/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    replace("@property (nonatomic) float " + match[1] + ";");
  )

atom.commands.add 'atom-text-editor', 'replace-selected-double-quotes-with-single-quotes': (e) ->
  editor = @getModel()
  selectedText = editor.getSelectedText()
  selectedBufferRange = editor.getSelectedBufferRange()
  
  regex = /"/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    replace("'");
  )
  
atom.commands.add 'atom-text-editor', 'insert-inherited-functions': (e) ->
  editor = @getModel()
  allText = editor.getText()
  
  classPattern = /^[\w ]+class (\w+)\W+(\w+).*{.*$/m
  [_, className, baseClassName] = allText.match(classPattern)
  
  title = editor.getTitle()
  [_, extension] = title.match(/^.*?\.(\w+)$/)
  if !extension?
    atom.notifications.addError("Failed to get extension for title: " + title, {dismissable: true})
    return
  
  baseClassPattern = new RegExp("class " + baseClassName, "g")
  results = []
  atom.workspace.scan(baseClassPattern, paths: ["*\." + extension], (result) -> 
    results.push(result)
  ).then (res) -> (
    if results.length == 0
      atom.notifications.addError("Couldn't find file for: " + baseClassPattern + " with extension: " + extension, {dismissable: true})
      return
    else if results.length != 1
      atom.notifications.addError("TODO (darren): need support multiple file paths returning", {dismissable: true})
      return
      
    filePath = results[0].filePath
    
    baseClassFile = new File(filePath)
    baseClassFile.read().then (baseClassText) -> (
      overridableFunctionsPattern = /^\ *(\w+ (virtual|override).*{).*$/gm
      allMatches = []
      baseClassText.replace overridableFunctionsPattern, (m, g1) ->
        allMatches.push(g1)
      
      if allMatches.length == 0
        atom.notifications.addWarning("Couldn't find any matches inside file: " + filePath, {dismissable: true})
        return
      
      editor.moveDown(1)
      editor.insertNewline()
      editor.moveUp(1)
      
      firstMatchPassed = false
      pasteText = ""
      for match in allMatches
        newFunctionText = match.replace("virtual", "override")
        
        if firstMatchPassed
          pasteText += "\n"
        pasteText += "\n" + newFunctionText + "\n\n}"
        
        firstMatchPassed = true
      editor.insertText(pasteText, autoIndent: true)
    )
  )
