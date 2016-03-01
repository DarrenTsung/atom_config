# Refactoring status: 95%
{Range} = require 'atom'
_ = require 'underscore-plus'

Base = require './base'
swrap = require './selection-wrapper'
{
  rangeToBeginningOfFileFromPoint, rangeToEndOfFileFromPoint
  sortRanges, countChar, pointIsAtEndOfLine, getEolBufferPositionForRow
  getTextToPoint
  getIndentLevelForBufferRow
  getCodeFoldRowRangesContainesForRow
  getBufferRangeForRowRange
  isIncludeFunctionScopeForRow
} = require './utils'

class TextObject extends Base
  @extend(false)
  allowSubmodeChange: true

  constructor: ->
    @constructor::inner = @constructor.name.startsWith('Inner')
    super
    @onDidSetTarget (@operator) => @operator
    @initialize?()

  isInner: ->
    @inner

  isA: ->
    not @isInner()

  isAllowSubmodeChange: ->
    @allowSubmodeChange

  isLinewise: ->
    submode = if @isAllowSubmodeChange()
      swrap.detectVisualModeSubmode(@editor)
    else
      @vimState.submode
    submode is 'linewise'

  select: ->
    for selection in @editor.getSelections()
      @selectTextObject(selection)
      {start, end} = selection.getBufferRange()
      if (end.column is 0) and swrap(selection).detectVisualModeSubmode() is 'characterwise'
        end = getEolBufferPositionForRow(@editor, end.row - 1)
        swrap(selection).setBufferRangeSafely([start, end])

# -------------------------
# [FIXME] make it expandable
class Word extends TextObject
  @extend(false)
  selectTextObject: (selection) ->
    wordRegex = @wordRegExp ? selection.cursor.wordRegExp()
    if @isInner()
      @selectInner(selection, wordRegex)
    else
      @selectA(selection, wordRegex)

  selectInner: (selection, wordRegex=null) ->
    selection.selectWord()

  selectA: (selection, wordRegex=null) ->
    @selectInner(selection, wordRegex)
    scanRange = selection.cursor.getCurrentLineBufferRange()
    headPoint = selection.getHeadBufferPosition()
    scanRange.start = headPoint
    @editor.scanInBufferRange /\s+/, scanRange, ({range, stop}) ->
      if headPoint.isEqual(range.start)
        selection.selectToBufferPosition range.end
        stop()

class AWord extends Word
  @extend()

class InnerWord extends Word
  @extend()

# -------------------------
class WholeWord extends Word
  @extend(false)
  wordRegExp: /\S+/
  selectInner: (selection, wordRegex) ->
    range = selection.cursor.getCurrentWordBufferRange({wordRegex})
    swrap(selection).setBufferRangeSafely range

class AWholeWord extends WholeWord
  @extend()

class InnerWholeWord extends WholeWord
  @extend()

# -------------------------
# Just include _, -
class SmartWord extends Word
  @extend(false)
  wordRegExp: /[\w-]+/
  selectInner: (selection, wordRegex) ->
    range = selection.cursor.getCurrentWordBufferRange({wordRegex})
    swrap(selection).setBufferRangeSafely range

class ASmartWord extends SmartWord
  @extend()

class InnerSmartWord extends SmartWord
  @extend()

# -------------------------
class Pair extends TextObject
  @extend(false)
  allowNextLine: false
  allowSubmodeChange: false
  enclosed: true
  pair: null

  # Return 'open' or 'close'
  getPairState: (pair, matchText, range) ->
    [openChar, closeChar] = pair
    if openChar is closeChar
      @pairStateInBufferRange(range, openChar)
    else
      ['open', 'close'][pair.indexOf(matchText)]

  pairStateInBufferRange: (range, char) ->
    text = getTextToPoint(@editor, range.end)
    pattern = ///[^\\]?#{_.escapeRegExp(char)}///
    ['close', 'open'][(countChar(text, pattern) % 2)]

  # Take start point of matched range.
  escapeChar = '\\'
  isEscapedCharAtPoint: (point) ->
    range = Range.fromPointWithDelta(point, 0, -1)
    @editor.getTextInBufferRange(range) is escapeChar

  # options.enclosed is only used when which is 'close'
  findPair: (pair, options) ->
    {from, which, allowNextLine, enclosed} = options
    switch which
      when 'open'
        scanFunc = 'backwardsScanInBufferRange'
        scanRange = rangeToBeginningOfFileFromPoint(from)
      when 'close'
        scanFunc = 'scanInBufferRange'
        scanRange = rangeToEndOfFileFromPoint(from)
    pairRegexp = pair.map(_.escapeRegExp).join('|')
    pattern = ///#{pairRegexp}///g

    found = null # We will search to fill this var.
    state = {open: [], close: []}

    @editor[scanFunc] pattern, scanRange, ({matchText, range, stop}) =>
      {start, end} = range
      return stop() if (not allowNextLine) and (from.row isnt start.row)
      return if @isEscapedCharAtPoint(start)

      pairState = @getPairState(pair, matchText, range)
      oppositeState = if pairState is 'open' then 'close' else 'open'
      if pairState is which
        openRange = state[oppositeState].pop()
      else
        state[pairState].push(range)

      if (pairState is which) and (state.open.length is 0) and (state.close.length is 0)
        if enclosed and openRange? and (which is 'close')
          return unless new Range(openRange.start, range.end).containsPoint(from)
        found = range
        return stop()
    found

  findOpen: (pair, options) ->
    options.which = 'open'
    options.allowNextLine ?= @allowNextLine
    @findPair(pair, options)

  findClose: (pair, options) ->
    options.which = 'close'
    options.allowNextLine ?= @allowNextLine
    @findPair(pair, options)

  getPairInfo: (from, pair, enclosed) ->
    pairInfo = null

    closeRange = @findClose pair, {from: from, enclosed}
    openRange = @findOpen pair, {from: closeRange.end} if closeRange?

    if openRange? and closeRange?
      aRange = new Range(openRange.start, closeRange.end)
      [innerStart, innerEnd] = [openRange.end, closeRange.start]
      innerStart = [innerStart.row + 1, 0] if pointIsAtEndOfLine(@editor, innerStart)
      innerEnd = [innerEnd.row, 0] if getTextToPoint(@editor, innerEnd).match(/^\s*$/)
      innerRange = new Range(innerStart, innerEnd)
      targetRange = if @isInner() then innerRange else aRange
      pairInfo = {openRange, closeRange, aRange, innerRange, targetRange}
    pairInfo

  getRange: (selection, {enclosed}={}) ->
    originalRange = selection.getBufferRange()
    from = selection.getHeadBufferPosition()

    # When selection is not empty, we have to start to search one column left
    if (not selection.isEmpty() and not selection.isReversed())
      from = from.translate([0, -1])

    pairInfo = @getPairInfo(from, @pair, enclosed)
    # When range was same, try to expand range
    if pairInfo?.targetRange.isEqual(originalRange)
      from = pairInfo.aRange.end.translate([0, +1])
      pairInfo = @getPairInfo(from, @pair, enclosed)
    pairInfo?.targetRange

  selectTextObject: (selection) ->
    swrap(selection).setBufferRangeSafely @getRange(selection, {@enclosed})

# -------------------------
class AnyPair extends Pair
  @extend(false)
  member: [
    'DoubleQuote', 'SingleQuote', 'BackTick',
    'CurlyBracket', 'AngleBracket', 'Tag', 'SquareBracket', 'Parenthesis'
  ]

  getRangeBy: (klass, selection) ->
    @new(klass, {@inner}).getRange(selection, {@enclosed})

  getRanges: (selection) ->
    (range for klass in @member when (range = @getRangeBy(klass, selection)))

  getNearestRange: (selection) ->
    ranges = @getRanges(selection)
    _.last(sortRanges(ranges)) if ranges.length

  selectTextObject: (selection) ->
    swrap(selection).setBufferRangeSafely @getNearestRange(selection)

class AAnyPair extends AnyPair
  @extend()

class InnerAnyPair extends AnyPair
  @extend()

# -------------------------
class AnyQuote extends AnyPair
  @extend(false)
  enclosed: false
  member: ['DoubleQuote', 'SingleQuote', 'BackTick']
  getNearestRange: (selection) ->
    ranges = @getRanges(selection)
    # Pick range which end.colum is leftmost(mean, closed first)
    _.first(_.sortBy(ranges, (r) -> r.end.column)) if ranges.length

class AAnyQuote extends AnyQuote
  @extend()

class InnerAnyQuote extends AnyQuote
  @extend()

# -------------------------
class DoubleQuote extends Pair
  @extend(false)
  pair: ['"', '"']
  enclosed: false

class ADoubleQuote extends DoubleQuote
  @extend()

class InnerDoubleQuote extends DoubleQuote
  @extend()

# -------------------------
class SingleQuote extends Pair
  @extend(false)
  pair: ["'", "'"]
  enclosed: false

class ASingleQuote extends SingleQuote
  @extend()

class InnerSingleQuote extends SingleQuote
  @extend()

# -------------------------
class BackTick extends Pair
  @extend(false)
  pair: ['`', '`']
  enclosed: false

class ABackTick extends BackTick
  @extend()

class InnerBackTick extends BackTick
  @extend()

# -------------------------
class CurlyBracket extends Pair
  @extend(false)
  pair: ['{', '}']
  allowNextLine: true

class ACurlyBracket extends CurlyBracket
  @extend()

class InnerCurlyBracket extends CurlyBracket
  @extend()

# -------------------------
class SquareBracket extends Pair
  @extend(false)
  pair: ['[', ']']
  allowNextLine: true

class ASquareBracket extends SquareBracket
  @extend()

class InnerSquareBracket extends SquareBracket
  @extend()

# -------------------------
class Parenthesis extends Pair
  @extend(false)
  pair: ['(', ')']
  allowNextLine: true

class AParenthesis extends Parenthesis
  @extend()

class InnerParenthesis extends Parenthesis
  @extend()

# -------------------------
class AngleBracket extends Pair
  @extend(false)
  pair: ['<', '>']

class AAngleBracket extends AngleBracket
  @extend()

class InnerAngleBracket extends AngleBracket
  @extend()

# -------------------------
# [TODO] See vim-mode#795
class Tag extends Pair
  @extend(false)
  pair: ['>', '<']

# class ATag extends Tag
#   @extend()

class InnerTag extends Tag
  @extend()

# Paragraph
# -------------------------
# In Vim world Paragraph is defined as consecutive (non-)blank-line.
class Paragraph extends TextObject
  @extend(false)

  getStartRow: (startRow, fn) ->
    for row in [startRow..0] when fn(row)
      return row + 1
    0

  getEndRow: (startRow, fn) ->
    lastRow = @editor.getLastBufferRow()
    for row in [startRow..lastRow] when fn(row)
      return row - 1
    lastRow

  getRange: (startRow) ->
    startRowIsBlank = @editor.isBufferRowBlank(startRow)
    fn = (row) =>
      @editor.isBufferRowBlank(row) isnt startRowIsBlank
    new Range([@getStartRow(startRow, fn), 0], [@getEndRow(startRow, fn) + 1, 0])

  selectParagraph: (selection) ->
    [startRow, endRow] = selection.getBufferRowRange()
    if swrap(selection).isSingleRow()
      swrap(selection).setBufferRangeSafely @getRange(startRow)
    else
      point = if selection.isReversed()
        startRow = Math.max(0, startRow - 1)
        @getRange(startRow)?.start
      else
        @getRange(endRow + 1)?.end
      selection.selectToBufferPosition point if point?

  selectTextObject: (selection) ->
    _.times @getCount(), =>
      @selectParagraph(selection)
      @selectParagraph(selection) if @instanceof('AParagraph')

class AParagraph extends Paragraph
  @extend()

class InnerParagraph extends Paragraph
  @extend()

# -------------------------
class Comment extends Paragraph
  @extend(false)

  getRange: (startRow) ->
    return unless @editor.isBufferRowCommented(startRow)
    fn = (row) =>
      return if (not @isInner() and @editor.isBufferRowBlank(row))
      @editor.isBufferRowCommented(row) in [false, undefined]
    new Range([@getStartRow(startRow, fn), 0], [@getEndRow(startRow, fn) + 1, 0])

class AComment extends Comment
  @extend()

class InnerComment extends Comment
  @extend()

# -------------------------
class Indentation extends Paragraph
  @extend(false)

  getRange: (startRow) ->
    return if @editor.isBufferRowBlank(startRow)
    baseIndentLevel = getIndentLevelForBufferRow(@editor, startRow)
    fn = (row) =>
      if @editor.isBufferRowBlank(row)
        @isInner()
      else
        getIndentLevelForBufferRow(@editor, row) < baseIndentLevel
    new Range([@getStartRow(startRow, fn), 0], [@getEndRow(startRow, fn) + 1, 0])

class AIndentation extends Indentation
  @extend()

class InnerIndentation extends Indentation
  @extend()

# -------------------------
class Fold extends TextObject
  @extend(false)

  adjustRowRange: ([startRow, endRow]) ->
    return [startRow, endRow] unless @isInner()
    startRowIndentLevel = getIndentLevelForBufferRow(@editor, startRow)
    endRowIndentLevel = getIndentLevelForBufferRow(@editor, endRow)
    endRow -= 1 if (startRowIndentLevel is endRowIndentLevel)
    startRow += 1
    [startRow, endRow]

  getFoldRowRangesContainsForRow: (row) ->
    getCodeFoldRowRangesContainesForRow(@editor, row, true)?.reverse()

  selectTextObject: (selection) ->
    range = selection.getBufferRange()
    rowRanges = @getFoldRowRangesContainsForRow(range.start.row)
    return unless rowRanges?

    if (rowRange = rowRanges.shift())?
      rowRange = @adjustRowRange(rowRange)
      targetRange = getBufferRangeForRowRange(@editor, rowRange)
      if targetRange.isEqual(range) and rowRanges.length
        rowRange = @adjustRowRange(rowRanges.shift())
    if rowRange?
      swrap(selection).selectRowRange(rowRange)

class AFold extends Fold
  @extend()

class InnerFold extends Fold
  @extend()

# -------------------------
# NOTE: Function range determination is depending on fold.
class Function extends Fold
  @extend(false)

  # Some language don't include closing `}` into fold.
  omittingClosingCharLanguages: ['go']

  initialize: ->
    @language = @editor.getGrammar().scopeName.replace(/^source\./, '')

  getFoldRowRangesContainsForRow: (row) ->
    rowRanges = getCodeFoldRowRangesContainesForRow(@editor, row)?.reverse()
    rowRanges?.filter (rowRange) =>
      isIncludeFunctionScopeForRow(@editor, rowRange[0])

  adjustRowRange: (rowRange) ->
    [startRow, endRow] = super
    if @isA() and (@language in @omittingClosingCharLanguages)
      endRow += 1
    [startRow, endRow]

class AFunction extends Function
  @extend()

class InnerFunction extends Function
  @extend()

# -------------------------
class CurrentLine extends TextObject
  @extend(false)
  selectTextObject: (selection) ->
    {cursor} = selection
    cursor.moveToBeginningOfLine()
    cursor.moveToFirstCharacterOfLine() if @isInner()
    selection.selectToEndOfBufferLine()

class ACurrentLine extends CurrentLine
  @extend()

class InnerCurrentLine extends CurrentLine
  @extend()

# -------------------------
class Entire extends TextObject
  @extend(false)
  selectTextObject: (selection) ->
    @editor.selectAll()

class AEntire extends Entire
  @extend()

class InnerEntire extends Entire
  @extend()

# -------------------------
class LatestChange extends TextObject
  @extend(false)
  getRange: ->
    @vimState.mark.getRange('[', ']')

  selectTextObject: (selection) ->
    swrap(selection).setBufferRangeSafely @getRange()

class ALatestChange extends LatestChange
  @extend()

# No diff from ALatestChange
class InnerLatestChange extends LatestChange
  @extend()
