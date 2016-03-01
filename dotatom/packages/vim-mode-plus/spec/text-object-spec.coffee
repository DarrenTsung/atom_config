# Refactoring status: 80%
{getVimState, dispatch} = require './spec-helper'

describe "TextObject", ->
  [set, ensure, keystroke, editor, editorElement, vimState] = []

  getCheckFunctionFor = (textObject) ->
    (initialPoint, keystroke, options) ->
      set cursor: initialPoint
      ensure keystroke + textObject, options

  beforeEach ->
    getVimState (state, vimEditor) ->
      vimState = state
      {editor, editorElement} = vimState
      {set, ensure, keystroke} = vimEditor

  afterEach ->
    vimState.activate('reset')

  describe "TextObject", ->
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('language-coffee-script')
      getVimState 'sample.coffee', (state, vimEditor) ->
        {editor, editorElement} = state
        {set, ensure, keystroke} = vimEditor
    afterEach ->
      atom.packages.deactivatePackage('language-coffee-script')

    describe "when TextObject is excuted directly", ->
      it "select that TextObject", ->
        set cursor: [8, 7]
        dispatch(editorElement, 'vim-mode-plus:inner-word')
        ensure selectedText: 'QuickSort'

  describe "Word", ->
    describe "inner-word", ->
      beforeEach ->
        set
          text: "12345 abcde ABCDE"
          cursor: [0, 9]

      it "applies operators inside the current word in operator-pending mode", ->
        ensure 'diw',
          text:     "12345  ABCDE"
          cursor:   [0, 6]
          register: '"': text: 'abcde'
          mode: 'normal'

      it "selects inside the current word in visual mode", ->
        ensure 'viw',
          selectedScreenRange: [[0, 6], [0, 11]]

      it "works with multiple cursors", ->
        set addCursor: [0, 1]
        ensure 'viw',
          selectedBufferRange: [
            [[0, 6], [0, 11]]
            [[0, 0], [0, 5]]
          ]

      describe "cursor is on next to NonWordCharacter", ->
        beforeEach ->
          set
            text: "abc(def)"
            cursor: [0, 4]

        it "change inside word", ->
          ensure 'ciw', text: "abc()", mode: "insert"

        it "delete inside word", ->
          ensure 'diw', text: "abc()", mode: "normal"

      describe "cursor's next char is NonWordCharacter", ->
        beforeEach ->
          set
            text: "abc(def)"
            cursor: [0, 6]

        it "change inside word", ->
          ensure 'ciw', text: "abc()", mode: "insert"

        it "delete inside word", ->
          ensure 'diw', text: "abc()", mode: "normal"

    describe "a-word", ->
      beforeEach ->
        set text: "12345 abcde ABCDE", cursor: [0, 9]

      it "applies operators from the start of the current word to the start of the next word in operator-pending mode", ->
        ensure 'daw',
          text: "12345 ABCDE"
          cursor: [0, 6]
          register: '"': text: "abcde "

      it "selects from the start of the current word to the start of the next word in visual mode", ->
        ensure 'vaw', selectedScreenRange: [[0, 6], [0, 12]]

      it "doesn't span newlines", ->
        set text: "12345\nabcde ABCDE", cursor: [0, 3]
        ensure 'vaw', selectedBufferRange: [[0, 0], [0, 5]]

      it "doesn't span special characters", ->
        set text: "1(345\nabcde ABCDE", cursor: [0, 3]
        ensure 'vaw', selectedBufferRange: [[0, 2], [0, 5]]

  describe "WholeWord", ->
    describe "inner-whole-word", ->
      beforeEach ->
        set text: "12(45 ab'de ABCDE", cursor: [0, 9]

      it "applies operators inside the current whole word in operator-pending mode", ->
        ensure 'diW', text: "12(45  ABCDE", cursor: [0, 6], register: '"': text: "ab'de"

      it "selects inside the current whole word in visual mode", ->
        ensure 'viW', selectedScreenRange: [[0, 6], [0, 11]]
    describe "a-whole-word", ->
      beforeEach ->
        set text: "12(45 ab'de ABCDE", cursor: [0, 9]

      it "applies operators from the start of the current whole word to the start of the next whole word in operator-pending mode", ->
        ensure 'daW',
          text: "12(45 ABCDE"
          cursor: [0, 6]
          register: '"': text: "ab'de "
          mode: 'normal'

      it "selects from the start of the current whole word to the start of the next whole word in visual mode", ->
        ensure 'vaW', selectedScreenRange: [[0, 6], [0, 12]]

      it "doesn't span newlines", ->
        set text: "12(45\nab'de ABCDE", cursor: [0, 4]
        ensure 'vaW', selectedBufferRange: [[0, 0], [0, 5]]

  describe "AnyPair", ->
    {simpleText, complexText} = {}
    beforeEach ->
      simpleText = """
        .... "abc" ....
        .... 'abc' ....
        .... `abc` ....
        .... {abc} ....
        .... <abc> ....
        .... >abc< ....
        .... [abc] ....
        .... (abc) ....
        """
      complexText = """
        [4s
        --{3s
        ----"2s(1s-1e)2e"
        ---3e}-4e
        ]
        """
      set
        text: simpleText
        cursor: [0, 7]
    describe "inner-any-pair", ->
      it "applies operators any inner-pair and repeatable", ->
        ensure 'dis',
          text: """
            .... "" ....
            .... 'abc' ....
            .... `abc` ....
            .... {abc} ....
            .... <abc> ....
            .... >abc< ....
            .... [abc] ....
            .... (abc) ....
            """
        ensure 'j.j.j.j.j.j.j.',
          text: """
            .... "" ....
            .... '' ....
            .... `` ....
            .... {} ....
            .... <> ....
            .... >< ....
            .... [] ....
            .... () ....
            """
      it "can expand selection", ->
        set text: complexText, cursor: [2, 8]
        keystroke 'v'
        ensure 'is', selectedText: """1s-1e"""
        ensure 'is', selectedText: """2s(1s-1e)2e"""
        ensure 'is', selectedText: """3s\n----"2s(1s-1e)2e"\n---3e"""
        ensure 'is', selectedText: """4s\n--{3s\n----"2s(1s-1e)2e"\n---3e}-4e"""
    describe "a-any-pair", ->
      it "applies operators any a-pair and repeatable", ->
        ensure 'das',
          text: """
            ....  ....
            .... 'abc' ....
            .... `abc` ....
            .... {abc} ....
            .... <abc> ....
            .... >abc< ....
            .... [abc] ....
            .... (abc) ....
            """
        ensure 'j.j.j.j.j.j.j.',
          text: """
            ....  ....
            ....  ....
            ....  ....
            ....  ....
            ....  ....
            ....  ....
            ....  ....
            ....  ....
            """
      it "can expand selection", ->
        set text: complexText, cursor: [2, 8]
        keystroke 'v'
        ensure 'as', selectedText: """(1s-1e)"""
        ensure 'as', selectedText: """\"2s(1s-1e)2e\""""
        ensure 'as', selectedText: """{3s\n----"2s(1s-1e)2e"\n---3e}"""
        ensure 'as', selectedText: """[4s\n--{3s\n----"2s(1s-1e)2e"\n---3e}-4e\n]"""

  describe "AnyQuote", ->
    beforeEach ->
      set
        text: """
        --"abc" `def`  'efg'--
        """
        cursor: [0, 0]
    describe "inner-any-quote", ->
      it "applies operators any inner-pair and repeatable", ->
        ensure 'diq', text: """--"" `def`  'efg'--"""
        ensure '.', text: """--"" ``  'efg'--"""
        ensure '.', text: """--"" ``  ''--"""
      it "can select next quote", ->
        keystroke 'v'
        ensure 'iq', selectedText: 'abc'
        ensure 'iq', selectedText: 'def'
        ensure 'iq', selectedText: 'efg'
    describe "a-any-quote", ->
      it "applies operators any a-quote and repeatable", ->
        ensure 'daq', text: """-- `def`  'efg'--"""
        ensure '.'  , text: """--   'efg'--"""
        ensure '.'  , text: """--   --"""
        ensure '.'
      it "can select next quote", ->
        keystroke 'v'
        ensure 'aq', selectedText: '"abc"'
        ensure 'aq', selectedText: '`def`'
        ensure 'aq', selectedText: "'efg'"

  describe "DoubleQuote", ->
    describe "inner-double-quote", ->
      beforeEach ->
        set
          text: '" something in here and in "here" " and over here'
          cursor: [0, 9]

      it "applies operators inside the current string in operator-pending mode", ->
        ensure 'di"',
          text: '""here" " and over here'
          cursor: [0, 1]

      it "skip non-string area and operate forwarding string whithin line", ->
        set cursor: [0, 29]
        ensure 'di"',
          text: '" something in here and in "here"" and over here'
          cursor: [0, 33]

      it "makes no change if past the last string on a line", ->
        set cursor: [0, 39]
        ensure 'di"',
          text: '" something in here and in "here" " and over here'
          cursor: [0, 39]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i"')
        text = '-"+"-'
        textFinal = '-""-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
    describe "a-double-quote", ->
      originalText = '" something in here and in "here" "'
      beforeEach ->
        set text: originalText, cursor: [0, 9]

      it "applies operators around the current double quotes in operator-pending mode", ->
        ensure 'da"',
          text: 'here" "'
          cursor: [0, 0]
          mode: 'normal'

      # it "[Changed Behavior] wont applies if its not within string", ->
      it "skip non-string area and operate forwarding string whithin line", ->
        set cursor: [0, 29]
        ensure 'da"',
          text: '" something in here and in "here'
          cursor: [0, 31]
          mode: 'normal'
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('a"')
        text = '-"+"-'
        textFinal = '--'
        selectedText = '"+"'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
  describe "SingleQuote", ->
    describe "inner-single-quote", ->
      beforeEach ->
        set
          text: "' something in here and in 'here' ' and over here"
          cursor: [0, 9]

      it "applies operators inside the current string in operator-pending mode", ->
        ensure "di'",
          text: "''here' ' and over here"
          cursor: [0, 1]

      # [NOTE]
      # I don't like original behavior, this is counter intuitive.
      # Simply selecting area between quote is that normal user expects.
      # it "applies operators inside the next string in operator-pending mode (if not in a string)", ->
      # => Reverted to original behavior, but need careful consideration what is best.

      # it "[Changed behavior] applies operators inside area between quote", ->
      it "applies operators inside the next string in operator-pending mode (if not in a string)", ->
        set cursor: [0, 26]
        ensure "di'",
          text: "''here' ' and over here"
          cursor: [0, 1]

      it "makes no change if past the last string on a line", ->
        set cursor: [0, 39]
        ensure "di'",
          text: "' something in here and in 'here' ' and over here"
          cursor: [0, 39]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor("i'")
        text = "-'+'-"
        textFinal = "-''-"
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
    describe "a-single-quote", ->
      originalText = "' something in here and in 'here' '"
      beforeEach ->
        set text: originalText, cursor: [0, 9]

      it "applies operators around the current single quotes in operator-pending mode", ->
        ensure "da'",
          text: "here' '"
          cursor: [0, 0]
          mode: 'normal'

      it "applies operators inside the next string in operator-pending mode (if not in a string)", ->
        set cursor: [0, 29]
        ensure "da'",
          text: "' something in here and in 'here"
          cursor: [0, 31]
          mode: 'normal'
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor("a'")
        text = "-'+'-"
        textFinal = "--"
        selectedText = "'+'"
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
  describe "BackTick", ->
    originalText = "this is `sample` text."
    beforeEach ->
      set text: originalText, cursor: [0, 9]

    describe "inner-back-tick", ->
      it "applies operators inner-area", ->
        ensure "di`", text: "this is `` text.", cursor: [0, 9]

      it "do nothing when pair range is not under cursor", ->
        set cursor: [0, 16]
        ensure "di`", text: originalText, cursor: [0, 16]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i`')
        text = '-`+`-'
        textFinal = '-``-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
    describe "a-back-tick", ->
      it "applies operators inner-area", ->
        ensure "da`", text: "this is  text.", cursor: [0, 8]

      it "do nothing when pair range is not under cursor", ->
        set cursor: [0, 16]
        ensure "da`", text: originalText, cursor: [0, 16]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor("a`")
        text = "-`+`-"
        textFinal = "--"
        selectedText = "`+`"
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
  describe "CurlyBracket", ->
    describe "inner-curly-bracket", ->
      beforeEach ->
        set
          text: "{ something in here and in {here} }"
          cursor: [0, 9]

      it "applies operators to inner-area in operator-pending mode", ->
        ensure 'di{',
          text: "{}"
          cursor: [0, 1]

      it "applies operators to inner-area in operator-pending mode (second test)", ->
        set
          cursor: [0, 29]
        ensure 'di{',
          text: "{ something in here and in {} }"
          cursor: [0, 28]

      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i{')
        text = '-{+}-'
        textFinal = '-{}-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
    describe "a-curly-bracket", ->
      beforeEach ->
        set
          text: "{ something in here and in {here} }"
          cursor: [0, 9]

      it "applies operators to a-area in operator-pending mode", ->
        ensure 'da{',
          text: ''
          cursor: [0, 0]
          mode: 'normal'

      it "applies operators to a-area in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'da{',
          text: "{ something in here and in  }"
          cursor: [0, 27]
          mode: 'normal'
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor("a{")
        text = "-{+}-"
        textFinal = "--"
        selectedText = "{+}"
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}

  describe "AngleBracket", ->
    describe "inner-angle-bracket", ->
      beforeEach ->
        set
          text: "< something in here and in <here> >"
          cursor: [0, 9]

      it "applies operators inside the current word in operator-pending mode", ->
        ensure 'di<',
          text: "<>"
          cursor: [0, 1]

      it "applies operators inside the current word in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'di<',
          text: "< something in here and in <> >"
          cursor: [0, 28]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i<')
        text = '-<+>-'
        textFinal = '-<>-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
    describe "a-angle-bracket", ->
      beforeEach ->
        set
          text: "< something in here and in <here> >"
          cursor: [0, 9]

      it "applies operators around the current angle brackets in operator-pending mode", ->
        ensure 'da<',
          text: ''
          cursor: [0, 0]
          mode: 'normal'

      it "applies operators around the current angle brackets in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'da<',
          text: "< something in here and in  >"
          cursor: [0, 27]
          mode: 'normal'
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor("a<")
        text = "-<+>-"
        textFinal = "--"
        selectedText = "<+>"
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}

  describe "Tag", ->
    describe "inner-tag", ->
      beforeEach ->
        set
          text: "<something>here</something><again>"
          cursor: [0, 5]

      # [FIXME] original official vim-mode support this, but its also affect other
      # TextObject like i( I don't like original behavior.
      # So I disabled, but for HTML tags, there is some space to improve.
      xit "applies only if in the value of a tag", ->
        ensure 'dit',
          text: "<something></something><again>"
          cursor: [0, 11]

      it "applies operators inside the current word in operator-pending mode", ->
        set cursor: [0, 13]
        ensure 'dit',
          text: "<something></something><again>"
          cursor: [0, 11]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('it')
        text = '->+<-'
        textFinal = '-><-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}

  describe "SquareBracket", ->
    describe "inner-square-bracket", ->
      beforeEach ->
        set
          text: "[ something in here and in [here] ]"
          cursor: [0, 9]

      it "applies operators inside the current word in operator-pending mode", ->
        ensure 'di[',
          text: "[]"
          cursor: [0, 1]

      it "applies operators inside the current word in operator-pending mode (second test)", ->
        set
          cursor: [0, 29]
        ensure 'di[',
          text: "[ something in here and in [] ]"
          cursor: [0, 28]
    describe "a-square-bracket", ->
      beforeEach ->
        set
          text: "[ something in here and in [here] ]"
          cursor: [0, 9]

      it "applies operators around the current square brackets in operator-pending mode", ->
        ensure 'da[',
          text: ''
          cursor: [0, 0]
          mode: 'normal'

      it "applies operators around the current square brackets in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'da[',
          text: "[ something in here and in  ]"
          cursor: [0, 27]
          mode: 'normal'
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i[')
        text = '-[+]-'
        textFinal = '-[]-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('a[')
        text = '-[+]-'
        textFinal = '--'
        selectedText = '[+]'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}
  describe "Parenthesis", ->
    describe "inner-parenthesis", ->
      beforeEach ->
        set
          text: "( something in here and in (here) )"
          cursor: [0, 9]

      it "applies operators inside the current word in operator-pending mode", ->
        ensure 'di(',
          text: "()"
          cursor: [0, 1]

      it "applies operators inside the current word in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'di(',
          text: "( something in here and in () )"
          cursor: [0, 28]

      it "select inner () by skipping nesting pair", ->
        set
          text: 'expect(editor.getScrollTop())'
          cursor: [0, 7]
        ensure 'vi(', selectedText: 'editor.getScrollTop()'

      it "skip escaped pair case-1", ->
        set text: 'expect(editor.g\\(etScrollTp())', cursor: [0, 7]
        ensure 'vi(', selectedText: 'editor.g\\(etScrollTp()'

      it "skip escaped pair case-2", ->
        set text: 'expect(editor.getSc\\)rollTp())', cursor: [0, 7]
        ensure 'vi(', selectedText: 'editor.getSc\\)rollTp()'

      it "skip escaped pair case-3", ->
        set text: 'expect(editor.ge\\(tSc\\)rollTp())', cursor: [0, 7]
        ensure 'vi(', selectedText: 'editor.ge\\(tSc\\)rollTp()'

      it "works with multiple cursors", ->
        set
          text: "( a b ) cde ( f g h ) ijk"
          cursor: [[0, 2], [0, 18]]
        ensure 'vi(',
          selectedBufferRange: [
            [[0, 1],  [0, 6]]
            [[0, 13], [0, 20]]
          ]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('i(')
        text = '-(+)-'
        textFinal = '-()-'
        selectedText = '+'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 2]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 2]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}

    describe "a-parenthesis", ->
      beforeEach ->
        set
          text: "( something in here and in (here) )"
          cursor: [0, 9]

      it "applies operators around the current parentheses in operator-pending mode", ->
        ensure 'da(',
          text: ''
          cursor: [0, 0]
          mode: 'normal'

      it "applies operators around the current parentheses in operator-pending mode (second test)", ->
        set cursor: [0, 29]
        ensure 'da(',
          text: "( something in here and in  )"
          cursor: [0, 27]
      describe "cursor is on the pair char", ->
        check = getCheckFunctionFor('a(')
        text = '-(+)-'
        textFinal = '--'
        selectedText = '(+)'
        open = [0, 1]
        close = [0, 3]
        beforeEach ->
          set {text}
        it "case-1 normal", -> check open, 'd', text: textFinal, cursor: [0, 1]
        it "case-2 normal", -> check close, 'd', text: textFinal, cursor: [0, 1]
        it "case-3 visual", -> check open, 'v', {selectedText}
        it "case-4 visual", -> check close, 'v', {selectedText}

  describe "Paragraph", ->
    describe "inner-paragraph", ->
      beforeEach ->
        set
          text: "\nParagraph-1\nParagraph-1\nParagraph-1\n\n"
          cursor: [2, 2]

      it "applies operators inside the current paragraph in operator-pending mode", ->
        ensure 'yip',
          text: "\nParagraph-1\nParagraph-1\nParagraph-1\n\n"
          cursor: [1, 0]
          register: '"': text: "Paragraph-1\nParagraph-1\nParagraph-1\n"

      it "selects inside the current paragraph in visual mode", ->
        ensure 'vip',
          selectedScreenRange: [[1, 0], [4, 0]]
    describe "a-paragraph", ->
      beforeEach ->
        set
          text: "text\n\nParagraph-1\nParagraph-1\nParagraph-1\n\nmoretext"
          cursor: [3, 2]

      it "applies operators around the current paragraph in operator-pending mode", ->
        ensure 'yap',
          text: "text\n\nParagraph-1\nParagraph-1\nParagraph-1\n\nmoretext"
          cursor: [2, 0]
          register: '"': text: "Paragraph-1\nParagraph-1\nParagraph-1\n\n"

      it "selects around the current paragraph in visual mode", ->
        ensure 'vap',
          selectedScreenRange: [[2, 0], [6, 0]]

  describe 'Comment', ->
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('language-coffee-script')
      getVimState 'sample.coffee', (state, vim) ->
        {editor, editorElement} = state
        {set, ensure, keystroke} = vim
    afterEach ->
      atom.packages.deactivatePackage('language-coffee-script')

    describe 'inner-comment', ->
      it 'select inside comment block', ->
        set cursor: [0, 0]
        ensure 'vi/',
          selectedText: '# This\n# is\n# Comment\n'
          selectedBufferRange: [[0, 0], [3, 0]]

      it 'select one line comment', ->
        set cursor: [4, 0]
        ensure 'vi/',
          selectedText: '# One line comment\n'
          selectedBufferRange: [[4, 0], [5, 0]]

      it 'not select non-comment line', ->
        set cursor: [6, 0]
        ensure 'vi/',
          selectedText: '# Comment\n# border\n'
          selectedBufferRange: [[6, 0], [8, 0]]
    describe 'a-comment', ->
      it 'include blank line when selecting comment', ->
        set cursor: [0, 0]
        ensure 'va/',
          selectedText: """
          # This
          # is
          # Comment

          # One line comment

          # Comment
          # border\n
          """
          selectedBufferRange: [[0, 0], [8, 0]]

  describe 'Indentation', ->
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('language-coffee-script')
      getVimState 'sample.coffee', (vimState, vim) ->
        {editor, editorElement} = vimState
        {set, ensure, keystroke} = vim
    afterEach ->
      atom.packages.deactivatePackage('language-coffee-script')

    describe 'inner-indentation', ->
      it 'select lines with deeper indent-level', ->
        set cursor: [12, 0]
        ensure 'vii',
          selectedBufferRange: [[12, 0], [15, 0]]
    describe 'a-indentation', ->
      it 'wont stop on blank line when selecting indent', ->
        set cursor: [12, 0]
        ensure 'vai',
          selectedBufferRange: [[10, 0], [27, 0]]

  describe 'Fold', ->
    rangeForRows = (startRow, endRow) ->
      [[startRow, 0], [endRow + 1, 0]]

    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('language-coffee-script')
      getVimState 'sample.coffee', (vimState, vim) ->
        {editor, editorElement} = vimState
        {set, ensure, keystroke} = vim
    afterEach ->
      atom.packages.deactivatePackage('language-coffee-script')

    describe 'inner-fold', ->
      it "select inner range of fold", ->
        set cursor: [13, 0]
        ensure 'viz', selectedBufferRange: rangeForRows(10, 25)

      it "select inner range of fold", ->
        set cursor: [19, 0]
        ensure 'viz', selectedBufferRange: rangeForRows(19, 23)

      it "can expand selection", ->
        set cursor: [23, 0]
        keystroke 'v'
        ensure 'iz', selectedBufferRange: rangeForRows(23, 23)
        ensure 'iz', selectedBufferRange: rangeForRows(19, 23)
        ensure 'iz', selectedBufferRange: rangeForRows(10, 25)
        ensure 'iz', selectedBufferRange: rangeForRows(9, 28)

      describe "when startRow of selection is on fold startRow", ->
        it 'select outer fold(skip)', ->
          set cursor: [20, 7]
          ensure 'viz', selectedBufferRange: rangeForRows(19, 23)

      describe "when endRow of selection exceeds fold endRow", ->
        it "doesn't matter, select fold based on startRow of selection", ->
          set cursor: [20, 0]
          ensure 'VG', selectedBufferRange: rangeForRows(20, 30)
          ensure 'iz', selectedBufferRange: rangeForRows(19, 23)

      describe "when indent level of fold startRow and endRow is same", ->
        beforeEach ->
          waitsForPromise ->
            atom.packages.activatePackage('language-javascript')
          getVimState 'sample.js', (state, vimEditor) ->
            {editor, editorElement} = state
            {set, ensure, keystroke} = vimEditor
        afterEach ->
          atom.packages.deactivatePackage('language-javascript')

        it "doesn't select fold endRow", ->
          set cursor: [5, 0]
          ensure 'viz', selectedBufferRange: rangeForRows(5, 6)
          ensure 'az', selectedBufferRange: rangeForRows(4, 7)

    describe 'a-fold', ->
      it 'select fold row range', ->
        set cursor: [13, 0]
        ensure 'vaz', selectedBufferRange: rangeForRows(9, 25)

      it 'select fold row range', ->
        set cursor: [19, 0]
        ensure 'vaz', selectedBufferRange: rangeForRows(18, 23)

      it 'can expand selection', ->
        set cursor: [23, 0]
        keystroke 'v'
        ensure 'az', selectedBufferRange: rangeForRows(22, 23)
        ensure 'az', selectedBufferRange: rangeForRows(18, 23)
        ensure 'az', selectedBufferRange: rangeForRows(9, 25)
        ensure 'az', selectedBufferRange: rangeForRows(8, 28)

      describe "when startRow of selection is on fold startRow", ->
        it 'select outer fold(skip)', ->
          set cursor: [20, 7]
          ensure 'vaz', selectedBufferRange: rangeForRows(18, 23)

      describe "when endRow of selection exceeds fold endRow", ->
        it "doesn't matter, select fold based on startRow of selection", ->
          set cursor: [20, 0]
          ensure 'VG', selectedBufferRange: rangeForRows(20, 30)
          ensure 'az', selectedBufferRange: rangeForRows(18, 23)

  # Although following test picks specific language, other langauages are alsoe supported.
  describe 'Function', ->
    describe 'coffee', ->
      pack = 'language-coffee-script'
      scope = 'source.coffee'
      beforeEach ->
        waitsForPromise ->
          atom.packages.activatePackage(pack)

        set
          text: """
            # Commment

            hello = ->
              a = 1
              b = 2
              c = 3

            # Commment
            """
          cursor: [3, 0]

        runs ->
          grammar = atom.grammars.grammarForScopeName(scope)
          editor.setGrammar(grammar)
      afterEach ->
        atom.packages.deactivatePackage(pack)

      describe 'inner-function for coffee', ->
        it 'select except start row', ->
          ensure 'vif', selectedBufferRange: [[3, 0], [6, 0]]

      describe 'a-function for coffee', ->
        it 'select function', ->
          ensure 'vaf', selectedBufferRange: [[2, 0], [6, 0]]

    describe 'ruby', ->
      pack = 'language-ruby'
      scope = 'source.ruby'
      beforeEach ->
        waitsForPromise ->
          atom.packages.activatePackage(pack)
        set
          text: """
            # Commment

            def hello
              a = 1
              b = 2
              c = 3
            end

            # Commment
            """
          cursor: [3, 0]
        runs ->
          grammar = atom.grammars.grammarForScopeName(scope)
          editor.setGrammar(grammar)
      afterEach ->
        atom.packages.deactivatePackage(pack)

      describe 'inner-function for ruby', ->
        it 'select except start row', ->
          ensure 'vif', selectedBufferRange: [[3, 0], [6, 0]]
      describe 'a-function for ruby', ->
        it 'select function', ->
          ensure 'vaf', selectedBufferRange: [[2, 0], [7, 0]]

    describe 'go', ->
      pack = 'language-go'
      scope = 'source.go'
      beforeEach ->
        waitsForPromise ->
          atom.packages.activatePackage(pack)
        set
          text: """
            // Commment

            func main() {
              a := 1
              b := 2
              c := 3
            }

            // Commment
            """
          cursor: [3, 0]
        runs ->
          grammar = atom.grammars.grammarForScopeName(scope)
          editor.setGrammar(grammar)
      afterEach ->
        atom.packages.deactivatePackage(pack)

      describe 'inner-function for go', ->
        it 'select except start row', ->
          ensure 'vif', selectedBufferRange: [[3, 0], [6, 0]]

      describe 'a-function for go', ->
        it 'select function', ->
          ensure 'vaf', selectedBufferRange: [[2, 0], [7, 0]]

  describe 'CurrentLine', ->
    beforeEach ->
      set
        text: """
          This is
            multi line
          text
          """

    describe 'inner-current-line', ->
      it 'select current line without including last newline', ->
        set cursor: [0, 0]
        ensure 'vil', selectedText: 'This is'
      it 'also skip leading white space', ->
        set cursor: [1, 0]
        ensure 'vil', selectedText: 'multi line'
    describe 'a-current-line', ->
      it 'select current line without including last newline as like `vil`', ->
        set cursor: [0, 0]
        ensure 'val', selectedText: 'This is'
      it 'wont skip leading white space not like `vil`', ->
        set cursor: [1, 0]
        ensure 'val', selectedText: '  multi line'

  describe 'Entire', ->
    text = """
      This is
        multi line
      text
      """
    beforeEach ->
      set text: text, cursor: [0, 0]
    describe 'inner-entire', ->
      it 'select entire buffer', ->
        ensure 'escape', selectedText: ''
        ensure 'vie', selectedText: text
        ensure 'escape', selectedText: ''
        ensure 'jjvie', selectedText: text
    describe 'a-entire', ->
      it 'select entire buffer', ->
        ensure 'escape', selectedText: ''
        ensure 'vae', selectedText: text
        ensure 'escape', selectedText: ''
        ensure 'jjvae', selectedText: text
