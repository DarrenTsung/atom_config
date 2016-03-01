# Refactoring status: 0%
{getVimState, getView} = require './spec-helper'

packageName = 'vim-mode-plus'
describe "vim-mode-plus", ->
  [set, ensure, keystroke, editor, editorElement, vimState, workspaceElement] = []

  beforeEach ->
    getVimState (_vimState, vim) ->
      vimState = _vimState
      {editor, editorElement} = _vimState
      {set, ensure, keystroke} = vim

    workspaceElement = getView(atom.workspace)

    waitsForPromise ->
      atom.packages.activatePackage('status-bar')

  afterEach ->
    vimState.activate('reset') unless vimState.destroyed

  describe ".activate", ->
    it "puts the editor in normal-mode initially by default", ->
      ensure mode: 'normal'

    it "shows the current vim mode in the status bar", ->
      statusBarTile = null

      waitsFor ->
        statusBarTile = workspaceElement.querySelector("#status-bar-vim-mode-plus")

      runs ->
        expect(statusBarTile.textContent).toBe("Normal")
        ensure 'i', mode: 'insert'
        expect(statusBarTile.textContent).toBe("Insert")

    it "doesn't register duplicate command listeners for editors", ->
      set
        text: '12345'
        cursorBuffer: [0, 0]

      pane = atom.workspace.getActivePane()
      newPane = pane.splitRight()
      pane.removeItem(editor)
      newPane.addItem(editor)

      ensure 'l', cursorBuffer: [0, 1]

  describe ".deactivate", ->
    it "removes the vim classes from the editor", ->
      atom.packages.deactivatePackage(packageName)
      expect(editorElement.classList.contains("vim-mode-plus")).toBe(false)
      expect(editorElement.classList.contains("normal-mode")).toBe(false)

    it "removes the vim commands from the editor element", ->
      vimCommands = ->
        atom.commands.findCommands(target: editorElement).filter (cmd) ->
          cmd.name.startsWith("vim-mode-plus:")

      expect(vimCommands().length).toBeGreaterThan(0)
      atom.packages.deactivatePackage(packageName)
      expect(vimCommands().length).toBe(0)
