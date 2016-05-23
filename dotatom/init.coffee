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
# Order the first consecutive usings
atom.workspace.observeTextEditors (editor) ->
  whiteListedGrammers = ['source.cs']
  editor.buffer.onWillSave ->
    currentGrammar = editor.getGrammar()?.scopeName
    if currentGrammar not in whiteListedGrammers
      return

    buffer = editor.getBuffer()

    consecutiveMatchingLineCount = 0
    for i in [0..(buffer.getLineCount() - 1)]
      lineRange = buffer.rangeForRow(i)

      matches = false
      buffer.scanInRange /^\s*using/i, lineRange, (match) ->
        matches = true

      if !matches
        break
      consecutiveMatchingLineCount = i

    if consecutiveMatchingLineCount <= 0
      return

    sortRange = new Range([0, 0], buffer.rangeForRow(consecutiveMatchingLineCount).end)
    text = editor.getTextInBufferRange(sortRange)
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

  privateVariableRegex = ///
    (\x20*[^\n]+?[^\.])\b(_[a-z]\w+)
  ///g
  while true
    matched = false
    editor.scanInBufferRange(privateVariableRegex, bufferRange, ({match, replace}) ->
      if /(private|public|protected)/i.test(match[0])
        return

      matched = true
      replace("#{match[1]}this.#{match[2]}")
    )

    if not matched
      break

  functionRegex = ///
    (\x20*[^\n]+?[^\.])\b([A-Z]\w+)
  ///g
  while true
    matched = false
    editor.scanInBufferRange(functionRegex, bufferRange, ({match, replace}) ->
      if /(\/\/|private|public|protected|new)/i.test(match[0])
        return

      numberOfDoubleQuotes = (match[0].match(/"/g) || []).length;
      numberOfSingleQuotes = (match[0].match(/'/g) || []).length;

      nonEvenNumberOfSingleQuotes = numberOfSingleQuotes % 2 != 0
      nonEvenNumberOfDoubleQuotes = numberOfDoubleQuotes % 2 != 0

      if nonEvenNumberOfDoubleQuotes || nonEvenNumberOfSingleQuotes
        return

      # if we have a valid subject, let's make sure it's in this file
      declarationInFile = false
      #(private|public|protected)\s+\w+\s+.*\bDiscardRecording\b\s*(?:\([^\)]*\))?\s*{
      editor.scanInBufferRange new RegExp("(private|public|protected)\\s+\\w+\\s+.*\\b#{match[2]}\\b\\s*(?:\\([^\\)]*\\))?\\s*{", ''), bufferRange, ({match}) ->
        if /(region|class|const|static)/i.test(match[0])
          return

        declarationInFile = true

      if not declarationInFile
        return

      matched = true
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



# VIM MODE PLUS EXTENSIONS
# General service consumer factory
getConsumer = (packageName, provider) ->
  (fn) ->
    atom.packages.onDidActivatePackage (pack) ->
      return unless pack.name is packageName
      service = pack.mainModule[provider]()
      fn(service)

# get vim-mode-plus service API provider
consumeVimModePlus = getConsumer 'vim-mode-plus', 'provideVimModePlus'
requireVimModePlus = (path) ->
  packPath = atom.packages.resolvePackagePath('vim-mode-plus')
  require "#{packPath}/lib/#{path}"

consumeVimModePlus ({Base}) ->
  # SUBWORD TEXT OBJECTS
  # Motion = Base.getClass('Motion')
  # class MoveSubword extends Motion
  #   @commandPrefix: 'vim-mode-plus-user'
  #   moveCursor: (cursor) ->
  #     cursor.moveToNextSubwordBoundary()
  #
  # MoveSubword.registerCommand() # `vim-mode-plus-user:move-subword`
  #
  # swrap = requireVimModePlus './selection-wrapper'
  #
  # class Subword extends Base.getClass('Word')
  #   @commandPrefix: 'vim-mode-plus-user'
  #   @extend(false)
  #   selectInner: (selection, wordRegex) ->
  #     wordRegex = selection.cursor.subwordRegExp()
  #     range = selection.cursor.getCurrentWordBufferRange({wordRegex})
  #     swrap(selection).setBufferRangeSafely range
  #
  # class ASubword extends Subword
  #   @commandPrefix: 'vim-mode-plus-user'
  #   @extend()
  #
  # class InnerSubword extends Subword
  #   @commandPrefix: 'vim-mode-plus-user'
  #   @extend()
  #
  # Subword.registerCommand()
  # ASubword.registerCommand()
  # InnerSubword.registerCommand()

