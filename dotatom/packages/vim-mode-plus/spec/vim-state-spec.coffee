# Refactoring status: 70%
_ = require 'underscore-plus'
{getVimState} = require './spec-helper'
settings = require '../lib/settings'

describe "VimState", ->
  [set, ensure, keystroke, editor, editorElement, vimState] = []

  beforeEach ->
    getVimState (state, vim) ->
      vimState = state
      {editor, editorElement} = vimState
      {set, ensure, keystroke} = vim

  beforeEach ->
    vimState.activate('reset')

  describe "initialization", ->
    it "puts the editor in normal-mode initially by default", ->
      ensure mode: 'normal'

    it "puts the editor in insert-mode if startInInsertMode is true", ->
      settings.set 'startInInsertMode', true
      getVimState (state, vim) ->
        vim.ensure mode: 'insert'

  describe "::destroy", ->
    it "re-enables text input on the editor", ->
      expect(editorElement.component.isInputEnabled()).toBeFalsy()
      vimState.destroy()
      expect(editorElement.component.isInputEnabled()).toBeTruthy()

    it "removes the mode classes from the editor", ->
      ensure mode: 'normal'
      vimState.destroy()
      expect(editorElement.classList.contains("normal-mode")).toBeFalsy()

    it "is a noop when the editor is already destroyed", ->
      editorElement.getModel().destroy()
      vimState.destroy()

  describe "normal-mode", ->
    describe "when entering an insertable character", ->
      beforeEach ->
        keystroke '\\'

      it "stops propagation", ->
        ensure text: ''

    describe "when entering an operator", ->
      beforeEach ->
        keystroke 'd'

      describe "with an operator that can't be composed", ->
        beforeEach ->
          keystroke 'x'

        it "clears the operator stack", ->
          expect(vimState.operationStack.isEmpty()).toBe(true)

      describe "the escape keybinding", ->
        beforeEach ->
          keystroke 'escape'

        it "clears the operator stack", ->
          expect(vimState.operationStack.isEmpty()).toBe(true)

      describe "the ctrl-c keybinding", ->
        beforeEach ->
          keystroke {ctrl: 'c'}

        it "clears the operator stack", ->
          expect(vimState.operationStack.isEmpty()).toBe(true)

    describe "the escape keybinding", ->
      it "clears any extra cursors", ->
        set
          text: "one-two-three"
          addCursor: [0, 3]
        ensure numCursors: 2
        ensure 'escape', numCursors: 1

    describe "the v keybinding", ->
      beforeEach ->
        set
          text: """
            abc
            """
          cursor: [0, 0]
        keystroke 'v'

      it "puts the editor into visual characterwise mode", ->
        ensure
          mode: ['visual', 'characterwise']

    describe "the V keybinding", ->
      beforeEach ->
        set
          text: "012345\nabcdef"
          cursor: [0, 0]

      it "puts the editor into visual linewise mode", ->
        ensure 'V', mode: ['visual', 'linewise']

      it "selects the current line", ->
        ensure 'V',
          selectedText: '012345\n'

    describe "the ctrl-v keybinding", ->
      it "puts the editor into visual blockwise mode", ->
        set text: "012345\n\nabcdef", cursor: [0, 0]
        ensure [ctrl: 'v'], mode: ['visual', 'blockwise']

    describe "selecting text", ->
      beforeEach ->
        spyOn(_._, "now").andCallFake -> window.now
        set text: "abc def", cursor: [0, 0]

      it "puts the editor into visual mode", ->
        ensure mode: 'normal'

        advanceClock(200)
        atom.commands.dispatch(editorElement, "core:select-right")
        ensure
          mode: ['visual', 'characterwise']
          selectedBufferRange: [[0, 0], [0, 1]]

      it "handles the editor being destroyed shortly after selecting text", ->
        set selectedBufferRange: [[0, 0], [0, 3]]
        editor.destroy()
        vimState.destroy()
        advanceClock(100)

      it 'handles native selection such as core:select-all', ->
        atom.commands.dispatch(editorElement, 'core:select-all')
        ensure selectedBufferRange: [[0, 0], [0, 7]]

    describe "the i keybinding", ->
      it "puts the editor into insert mode", ->
        ensure 'i', mode: 'insert'

    describe "the R keybinding", ->
      it "puts the editor into replace mode", ->
        ensure 'R', mode: ['insert', 'replace']

    describe "with content", ->
      beforeEach ->
        set text: "012345\n\nabcdef", cursor: [0, 0]

      describe "on a line with content", ->
        it "[Changed] won't adjust cursor position if outer command place the cursor on end of line('\\n') character", ->
          ensure mode: 'normal'
          atom.commands.dispatch(editorElement, "editor:move-to-end-of-line")
          ensure cursor: [0, 6]

      describe "on an empty line", ->
        it "allows the cursor to be placed on the \n character", ->
          set cursor: [1, 0]
          ensure cursor: [1, 0]

    describe 'with character-input operations', ->
      beforeEach ->
        set text: '012345\nabcdef'

      it 'properly clears the operations', ->
        ensure 'dr',
          mode: 'normal'
        expect(vimState.operationStack.isEmpty()).toBe(true)
        target = vimState.input.view.editorElement
        keystroke 'd'
        atom.commands.dispatch(target, 'core:cancel')
        ensure text: '012345\nabcdef'

  describe "insert-mode", ->
    beforeEach -> keystroke 'i'

    describe "with content", ->
      beforeEach ->
        set text: "012345\n\nabcdef"

      describe "when cursor is in the middle of the line", ->
        it "moves the cursor to the left when exiting insert mode", ->
          set cursor: [0, 3]
          ensure 'escape', cursor: [0, 2]

      describe "when cursor is at the beginning of line", ->
        it "leaves the cursor at the beginning of line", ->
          set cursor: [1, 0]
          ensure 'escape', cursor: [1, 0]

      describe "on a line with content", ->
        it "allows the cursor to be placed on the \n character", ->
          set cursor: [0, 6]
          ensure cursor: [0, 6]

    it "puts the editor into normal mode when <escape> is pressed", ->
      escape 'escape',
        mode: 'normal'

    it "puts the editor into normal mode when <ctrl-c> is pressed", ->
      ensure [{platform: 'platform-darwin'}, {ctrl: 'c'}],
        mode: 'normal'

  describe "replace-mode", ->
    describe "with content", ->
      beforeEach -> set text: "012345\n\nabcdef"

      describe "when cursor is in the middle of the line", ->
        it "moves the cursor to the left when exiting replace mode", ->
          set cursor: [0, 3]
          ensure ['R', 'escape'], cursor: [0, 2]

      describe "when cursor is at the beginning of line", ->
        beforeEach ->

        it "leaves the cursor at the beginning of line", ->
          set cursor: [1, 0]
          ensure ['R', 'escape'], cursor: [1, 0]

      describe "on a line with content", ->
        it "allows the cursor to be placed on the \n character", ->
          keystroke 'R'
          set cursor: [0, 6]
          ensure cursor: [0, 6]

    it "puts the editor into normal mode when <escape> is pressed", ->
      ensure ['R', 'escape'],
        mode: 'normal'

    it "puts the editor into normal mode when <ctrl-c> is pressed", ->
      ensure [{platform: 'platform-darwin'}, 'R', {ctrl: 'c'}],
        mode: 'normal'

  describe "visual-mode", ->
    beforeEach ->
      set
        text: "one two three"
        cursorBuffer: [0, 4]
      keystroke 'v'

    it "selects the character under the cursor", ->
      ensure
        selectedBufferRange: [[0, 4], [0, 5]]
        selectedText: 't'

    it "puts the editor into normal mode when <escape> is pressed", ->
      ensure 'escape',
        cursorBuffer: [0, 4]
        mode: 'normal'

    it "puts the editor into normal mode when <escape> is pressed on selection is reversed", ->
      ensure selectedText: 't'
      ensure 'hh',
        selectedText: 'e t'
        selectionIsReversed: true
      ensure 'escape',
        mode: 'normal'
        cursorBuffer: [0, 2]

    describe "motions", ->
      it "transforms the selection", ->
        ensure 'w', selectedText: 'two t'

      it "always leaves the initially selected character selected", ->
        ensure 'h', selectedText: ' t'
        ensure 'l', selectedText: 't'
        ensure 'l', selectedText: 'tw'

    describe "operators", ->
      it "operate on the current selection", ->
        set
          text: "012345\n\nabcdef"
          cursor: [0, 0]
        ensure 'Vd', text: "\nabcdef"

    describe "returning to normal-mode", ->
      it "operate on the current selection", ->
        set text: "012345\n\nabcdef"
        ensure ['V', 'escape'], selectedText: ''

    describe "the o keybinding", ->
      it "reversed each selection", ->
        set addCursor: [0, Infinity]
        ensure 'iw',
          selectedBufferRange: [
            [[0, 4], [0, 7]],
            [[0, 8], [0, 13]]
          ]
          cursorBuffer: [
            [0, 7]
            [0, 13]
          ]

        ensure 'o',
          selectedBufferRange: [
            [[0, 4], [0, 7]],
            [[0, 8], [0, 13]]
          ]
          cursorBuffer: [
            [0, 4]
            [0, 8]
          ]

      # [FIXME]
      # Current spec is based on actual behavior.
      # I disabled temporarily because simply passing this test is non-sence.
      # I need re-think, how spec would be.
      xit "harmonizes selection directions", ->
        set cursorBuffer: [0, 0]
        keystroke 'ee'
        set addCursor: [0, Infinity]
        ensure 'hh',
          selectedBufferRange: [
            [[0, 0], [0, 5]],
            [[0, 11], [0, 13]]
          ]
          cursorBuffer: [
            [0, 5]
            [0, 11]
          ]

        ensure 'o',
          selectedBufferRange: [
            [[0, 0], [0, 5]],
            [[0, 11], [0, 13]]
          ]
          cursorBuffer: [
            [0, 5]
            [0, 13]
          ]

    describe "activate visualmode within visualmode", ->
      cursorPosition = null
      beforeEach ->
        cursorPosition = [0, 4]
        set
          text: "line one\nline two\nline three\n"
          cursor: cursorPosition

        ensure 'escape', mode: 'normal'

      describe "activateVisualMode with same type puts the editor into normal mode", ->
        describe "characterwise: vv", ->
          it "activating twice make editor return to normal mode ", ->
            ensure 'v', mode: ['visual', 'characterwise']
            ensure 'v', mode: 'normal', cursor: cursorPosition

        describe "linewise: VV", ->
          it "activating twice make editor return to normal mode ", ->
            ensure 'V', mode: ['visual', 'linewise']
            ensure 'V', mode: 'normal', cursor: cursorPosition

        describe "blockwise: ctrl-v twice", ->
          it "activating twice make editor return to normal mode ", ->
            ensure {ctrl: 'v'}, mode: ['visual', 'blockwise']
            ensure {ctrl: 'v'}, mode: 'normal', cursor: cursorPosition

      describe "change submode within visualmode", ->
        beforeEach ->
          set
            text: "line one\nline two\nline three\n"
            cursorBuffer: [[0, 5], [2, 5]]

        it "can change submode within visual mode", ->
          ensure 'v'        , mode: ['visual', 'characterwise']
          ensure 'V'        , mode: ['visual', 'linewise']
          ensure {ctrl: 'v'}, mode: ['visual', 'blockwise']
          ensure 'v'        , mode: ['visual', 'characterwise']

        it "recover original range when shift from linewise to characterwise", ->
          ensure 'viw', selectedText: ['one', 'three']
          ensure 'V', selectedText: ["line one\n", "line three\n"]
          ensure 'v', selectedText: ["one", "three"]

    describe "deactivating visual mode", ->
      beforeEach ->
        ensure 'escape', mode: 'normal'
        set
          text: """
            line one
            line two
            line three\n
            """
          cursor: [0, 7]
      it "can put cursor at in visual char mode", ->
        ensure 'v', mode: ['visual', 'characterwise'], cursor: [0, 8]
      it "adjust cursor position 1 column left when deactivated", ->
        ensure ['v', 'escape'], mode: 'normal', cursor: [0, 7]
      it "[CHANGED from vim-mode] can not select new line in characterwise visual mode", ->
        ensure 'vll', cursor: [0, 8]
        ensure 'escape', mode: 'normal', cursor: [0, 7]

    describe "deactivating visual mode on blank line", ->
      beforeEach ->
        ensure 'escape', mode: 'normal'
        set
          text: """
            0: abc

            2: abc
            """
          cursor: [1, 0]
      it "v case-1", ->
        ensure 'v', mode: ['visual', 'characterwise'], cursor: [2, 0]
        ensure 'escape', mode: 'normal', cursor: [1, 0]
      it "v case-2 selection head is blank line", ->
        set cursor: [0, 1]
        ensure 'vj', mode: ['visual', 'characterwise'], cursor: [2, 0], selectedText: ": abc\n\n"
        ensure 'escape', mode: 'normal', cursor: [1, 0]
      it "V case-1", ->
        ensure 'V', mode: ['visual', 'linewise'], cursor: [2, 0]
        ensure 'escape', mode: 'normal', cursor: [1, 0]
      it "V case-2 selection head is blank line", ->
        set cursor: [0, 1]
        ensure 'Vj', mode: ['visual', 'linewise'], cursor: [2, 0], selectedText: "0: abc\n\n"
        ensure 'escape', mode: 'normal', cursor: [1, 0]
      it "ctrl-v", ->
        ensure {ctrl: 'v'}, mode: ['visual', 'blockwise'], cursor: [2, 0]
        ensure 'escape', mode: 'normal', cursor: [1, 0]


  describe "marks", ->
    beforeEach -> set text: "text in line 1\ntext in line 2\ntext in line 3"

    it "basic marking functionality", ->
      set cursor: [1, 1]
      ensure ['m', char: 't'],
        text: "text in line 1\ntext in line 2\ntext in line 3"
      set cursor: [2, 2]
      ensure ['`', char: 't'], cursor: [1, 1]

    it "real (tracking) marking functionality", ->
      set cursor: [2, 2]
      keystroke ['m', char: 'q']
      set cursor: [1, 2]
      ensure ['o', 'escape', '`', char: 'q'], cursor: [3, 2]

    it "real (tracking) marking functionality", ->
      set cursor: [2, 2]
      keystroke ['m', char: 'q']
      set cursor: [1, 2]
      ensure ['dd', 'escape', '`', char: 'q'], cursor: [1, 2]
