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
{Point, Range} = require 'atom'

atom.commands.add 'atom-text-editor',
  'editor:toggle-current-row-folding': (event) ->
    editor = @getModel()
    bufferRow = editor.bufferPositionForScreenPosition(editor.getCursorScreenPosition()).row
    if editor.isFoldedAtBufferRow(bufferRow)
      editor.unfoldBufferRow(bufferRow)
    else
      editor.foldBufferRow(bufferRow)

# START SORT 'USINGS' ON SAVE
# Sort any consecutive lines matching the patterns ('usings')
atom.workspace.observeTextEditors (editor) ->
  whiteListedGrammers = ['source.cs']
  editor.buffer.onWillSave ->
    currentGrammar = editor.getGrammar()?.scopeName
    if currentGrammar not in whiteListedGrammers
      return

    buffer = editor.getBuffer()

    startLine = 0
    endLine = 0
    for i in [0..(buffer.getLineCount() - 1)]
      lineRange = buffer.rangeForRow(i)

      matches = false
      buffer.scanInRange /^\s*using/i, lineRange, (match) ->
        matches = true

      if !matches
        if endLine > startLine
          sortLineRange(editor, startLine, endLine)
        startLine = i

      endLine = i

sortLineRange = (editor, startLineNumber, endLineNumber) ->
  buffer = editor.getBuffer()

  sortRange = new Range(buffer.rangeForRow(startLineNumber).start, buffer.rangeForRow(endLineNumber).end)
  sortLines(editor, sortRange)

sortLines = (editor, range) ->
  sortTextLines editor, localeCompareSort, range

sortTextLines = (editor, sorter, range) ->
  textLines = editor.getTextInBufferRange(range).split(/\r?\n/g)
  textLines = sorter(textLines)
  editor.setTextInBufferRange(range, textLines.join("\n"))

localeCompareSort = (textLines) ->
    textLines.sort (a, b) -> a.localeCompare(b)
# END SORT 'USINGS' ON SAVE


# START 'place this. in front of all the things!'
atom.commands.add 'atom-text-editor', 'thisify-storm8': (e) ->
  editor = @getModel()

  bufferRange = editor.getBuffer().getRange()

  className = ""
  classRegex = ///
    class\x20+(\w+(?:<[^>]+>)?)
  ///g
  editor.scanInBufferRange(classRegex, bufferRange, ({match}) ->
    className = match[1]
  )

  tokenRegex = ///
    (\x20*[^\n\w]*?[^\.])\b([_\w]+)
  ///g
  while true
    matched = false
    editor.scanInBufferRange(tokenRegex, bufferRange, ({match, replace, range}) ->
      lineRange = new Range(new Point(range.start.row, 0), range.end)
      lineText = editor.getTextInBufferRange(lineRange)
      if /(\/\/|private|public|protected)/i.test(lineText)
        return

      newRegex = new RegExp("new\\s+#{match[2]}", '')
      if newRegex.test(lineText)
        return

      numberOfDoubleQuotes = (lineText.match(/"/g) || []).length;
      numberOfSingleQuotes = (lineText.match(/'/g) || []).length;

      nonEvenNumberOfSingleQuotes = numberOfSingleQuotes % 2 != 0
      nonEvenNumberOfDoubleQuotes = numberOfDoubleQuotes % 2 != 0

      if nonEvenNumberOfDoubleQuotes || nonEvenNumberOfSingleQuotes
        return

      numberOfBrackets = (lineText.match(/(<|>)/g) || []).length;
      nonEvenNumberOfBrackets = numberOfBrackets % 2 != 0

      if nonEvenNumberOfBrackets
        return

      characterAfterMatchRange = new Range(range.end, [range.end.row, range.end.column + 1])
      characterAfterMatch = editor.getTextInBufferRange(characterAfterMatchRange)

      checkFunctionDeclaration = false
      if /\(/i.test(characterAfterMatch)
        checkFunctionDeclaration = true

      # if this is possible adding / removing listener (+= or -=)
      if /(\+|-)=/.test(lineText)
        checkFunctionDeclaration = true

      # if we have a valid subject, let's make sure it's in this file
      isStatic = false
      declarationInFile = false
      if checkFunctionDeclaration
        # check for function declarations
        #(private|public|protected)\s+\w+(?:<[^>]+>)?\s+[^{=(]*\bDiscardRecording\b\s*(?:\([^\)]*\))?\s*{
        editor.scanInBufferRange new RegExp("(private|public|protected)\\s+\\w+(?:<[^>]+>)?\\s+[^{=(]*\\b#{match[2]}\\b\\s*(?:\\([^\\)]*\\))?\\s*{", ''), bufferRange, ({match, range}) ->
          declarationLineRange = new Range(new Point(range.start.row, 0), range.end)
          declarationLineText = editor.getTextInBufferRange(declarationLineRange)
          if /(region|class|enum)/i.test(declarationLineText)
            return

          if /(const|static)/i.test(declarationLineText)
            isStatic = true

          declarationInFile = true

      # always check for variable declarations
      #(private|public|protected)\s+\w+(?:<[^>]+>)?\s+[^{=(]*\bget\b\s*(;|=|{)
      editor.scanInBufferRange new RegExp("(private|public|protected)\\s+\\w+(?:<[^>]+>)?\\s+[^{=(]*\\b#{match[2]}\\b\\s*(;|=|{)", ''), bufferRange, ({match, range}) ->
        declarationLineRange = new Range(new Point(range.start.row, 0), range.end)
        declarationLineText = editor.getTextInBufferRange(declarationLineRange)
        if /(region|class|enum)/i.test(declarationLineText)
          return

        if /(const|static)/i.test(declarationLineText)
          isStatic = true

        declarationInFile = true

      if not declarationInFile
        return

      matched = true
      if isStatic
        replace("#{match[1]}#{className}.#{match[2]}")
      else
        replace("#{match[1]}this.#{match[2]}")
    )

    if not matched
      break
# END 'this-ify script'

#pragma mark - Storm8
atom.commands.add 'atom-text-editor', 'replace-selected-double-quotes-with-single-quotes': (e) ->
  editor = @getModel()
  selectedBufferRange = editor.getSelectedBufferRange()

  regex = /"/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    replace("'");
  )

atom.commands.add 'atom-text-editor', 'replace-php-array-indexer-with-idx': (e) ->
  editor = @getModel()
  selectedBufferRange = editor.getSelectedBufferRange()

  regex = /(\$[^\$]+)\[([^\]]+)\]/g
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    replace('idx(' + match[1] + ', ' + match[2] + ')');
  )

atom.commands.add 'atom-text-editor', 'replace-old-constant-style-with-new': (e) ->
  editor = @getModel()
  bufferRange = editor.getBuffer().getRange()

  regex = ///\b(_[A-Z][_A-Z]{2,})\b///g
  editor.scanInBufferRange(regex, bufferRange, ({match, replace}) ->
    oldConstant = match[1].toLowerCase()
    newConstant = []

    removedUnderscore = false
    for i in [0..(oldConstant.length - 1)]
      char = oldConstant[i]
      if char == '_'
        removedUnderscore = true
        continue
      else
        if (removedUnderscore)
          char = char.toUpperCase()
        newConstant.push(char)
        removedUnderscore = false

    replace('k' + newConstant.join(''))
  )
