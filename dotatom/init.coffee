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

atom.commands.add 'atom-text-editor',
  'editor:toggle-current-row-folding': (event) ->
    editor = @getModel()
    bufferRow = editor.bufferPositionForScreenPosition(editor.getCursorScreenPosition()).row
    if editor.isFoldedAtBufferRow(bufferRow)
      editor.unfoldBufferRow(bufferRow)
    else
      editor.foldBufferRow(bufferRow)

#pragma mark - Storm8
atom.commands.add 'atom-text-editor', 'replace-selected-double-quotes-with-single-quotes': (e) ->
  editor = @getModel()
  selectedText = editor.getSelectedText()
  selectedBufferRange = editor.getSelectedBufferRange()

  regex = /"/gm
  editor.scanInBufferRange(regex, selectedBufferRange, ({match, replace}) ->
    replace("'");
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

