_ = require 'underscore-plus'
{Range, Disposable} = require 'atom'
{isLinewiseRange} = require './utils'

propertyStorage = null

getClipOptions = (editor, direction) ->
  if editor.displayLayer?
    {clipDirection: direction}
  else
    switch direction
      when 'backward' then {clip: direction}
      when 'forward' then {clip: direction, wrapBeyondNewlines: true}

class SelectionWrapper
  @init: ->
    propertyStorage = new Map()
    new Disposable ->
      propertyStorage.clear()
      propertyStorage = null

  constructor: (@selection) ->

  hasProperties: ->
    propertyStorage.has(@selection)

  getProperties: ->
    propertyStorage.get(@selection) ? {}

  setProperties: (prop) ->
    propertyStorage.set(@selection, prop)

  resetProperties: ->
    propertyStorage?.delete(@selection)

  setBufferRangeSafely: (range) ->
    if range
      @setBufferRange(range)
      if @selection.isLastSelection()
        @selection.cursor.autoscroll()

  getBufferRange: ->
    @selection.getBufferRange()

  getNormalizedBufferPosition: ->
    point = @selection.getHeadBufferPosition()
    if @isForwarding()
      {editor} = @selection
      screenPoint = editor.screenPositionForBufferPosition(point).translate([0, -1])
      options = getClipOptions(editor, 'backward')
      editor.bufferPositionForScreenPosition(screenPoint, options)
    else
      point

  # Return function to dispose(=revert) normalization.
  normalizeBufferPosition: ->
    head = @selection.getHeadBufferPosition()
    point = @getNormalizedBufferPosition()
    @selection.modifySelection =>
      @selection.cursor.setBufferPosition(point)

    new Disposable =>
      unless head.isEqual(point)
        @selection.modifySelection =>
          @selection.cursor.setBufferPosition(head)

  getBufferPositionFor: (which, {fromProperty}={}) ->
    fromProperty ?= false
    if fromProperty and @hasProperties()
      {head, tail} = @getProperties()
      if head.isGreaterThanOrEqual(tail)
        [start, end] = [tail, head]
      else
        [start, end] = [head, tail]
    else
      {start, end} = @selection.getBufferRange()
      head = @selection.getHeadBufferPosition()
      tail = @selection.getTailBufferPosition()

    switch which
      when 'start' then start
      when 'end' then end
      when 'head' then head
      when 'tail' then tail

  # options: {fromProperty}
  setBufferPositionTo: (which, options) ->
    point = @getBufferPositionFor(which, options)
    @selection.cursor.setBufferPosition(point)

  mergeBufferRange: (range, option) ->
    @setBufferRange(@getBufferRange().union(range), option)

  reverse: ->
    @setReversedState(not @selection.isReversed())

    {head, tail} = @getProperties()
    if head? and tail?
      @setProperties(head: tail, tail: head)

  setReversedState: (reversed) ->
    @setBufferRange @getBufferRange(), {autoscroll: true, reversed, preserveFolds: true}

  getRows: ->
    [startRow, endRow] = @selection.getBufferRowRange()
    [startRow..endRow]

  getRowCount: ->
    [startRow, endRow] = @selection.getBufferRowRange()
    endRow - startRow + 1

  selectRowRange: (rowRange) ->
    {editor} = @selection
    [startRow, endRow] = rowRange
    rangeStart = editor.bufferRangeForBufferRow(startRow, includeNewline: true)
    rangeEnd = editor.bufferRangeForBufferRow(endRow, includeNewline: true)
    @setBufferRange rangeStart.union(rangeEnd), {preserveFolds: true}

  # Native selection.expandOverLine is not aware of actual rowRange of selection.
  expandOverLine: (options={}) ->
    {preserveGoalColumn} = options
    if preserveGoalColumn
      {goalColumn} = @selection.cursor

    @selectRowRange(@selection.getBufferRowRange())
    @selection.cursor.goalColumn = goalColumn if goalColumn

  getBufferRangeForTailRow: ->
    [startRow, endRow] = @selection.getBufferRowRange()
    row = if @selection.isReversed() then endRow else startRow
    @selection.editor.bufferRangeForBufferRow(row, includeNewline: true)

  getTailBufferRange: ->
    if (@isSingleRow() and @isLinewise())
      @getBufferRangeForTailRow()
    else
      {editor} = @selection
      start = @selection.getTailScreenPosition()
      end = if @selection.isReversed()
        options = getClipOptions(editor, 'backward')
        editor.clipScreenPosition(start.translate([0, -1]), options)
      else
        options = getClipOptions(editor, 'forward')
        editor.clipScreenPosition(start.translate([0, +1]), options)

      editor.bufferRangeForScreenRange([start, end])

  preserveCharacterwise: ->
    properties = @detectCharacterwiseProperties()
    unless @selection.isEmpty()
      endPoint = if @selection.isReversed() then 'tail' else 'head'
      # In case selection is empty, I don't want to translate end position
      # [FIXME] Check if removing this translation logic can simplify code?
      point = properties[endPoint].translate([0, -1])
      properties[endPoint] = @selection.editor.clipBufferPosition(point)
    @setProperties(properties)

  detectCharacterwiseProperties: ->
    head: @selection.getHeadBufferPosition()
    tail: @selection.getTailBufferPosition()

  getCharacterwiseHeadPosition: ->
    @getProperties().head

  selectByProperties: ({head, tail}) ->
    # No problem if head is greater than tail, Range constructor swap start/end.
    @setBufferRange([tail, head])
    @setReversedState(head.isLessThan(tail))

  # Equivalent to
  # "not (selection.isReversed() or selection.isEmpty())"
  isForwarding: ->
    head = @selection.getHeadBufferPosition()
    tail = @selection.getTailBufferPosition()
    head.isGreaterThan(tail)

  restoreCharacterwise: (options={}) ->
    {preserveGoalColumn} = options
    {goalColumn} = @selection.cursor if preserveGoalColumn

    {head, tail} = @getProperties()
    return unless head? and tail?

    if @selection.isReversed()
      [start, end] = [head, tail]
    else
      [start, end] = [tail, head]
    [start.row, end.row] = @selection.getBufferRowRange()

    editor = @selection.editor
    screenPoint = editor.screenPositionForBufferPosition(end).translate([0, 1])
    options = getClipOptions(editor, 'forward')
    end = editor.bufferPositionForScreenPosition(screenPoint, options)

    @setBufferRange([start, end], {preserveFolds: true})
    @resetProperties()
    @selection.cursor.goalColumn = goalColumn if goalColumn

  # Only for setting autoscroll option to false by default
  setBufferRange: (range, options={}) ->
    options.autoscroll ?= false
    @selection.setBufferRange(range, options)

  # Return original text
  replace: (text) ->
    originalText = @selection.getText()
    @selection.insertText(text)
    originalText

  lineTextForBufferRows: ->
    {editor} = @selection
    @getRows().map (row) ->
      editor.lineTextForBufferRow(row)

  translate: (startDelta, endDelta=startDelta, options) ->
    newRange = @getBufferRange().translate(startDelta, endDelta)
    @setBufferRange(newRange, options)

  isSingleRow: ->
    [startRow, endRow] = @selection.getBufferRowRange()
    startRow is endRow

  isLinewise: ->
    isLinewiseRange(@getBufferRange())

  detectVisualModeSubmode: ->
    switch
      when @isLinewise() then 'linewise'
      when not @selection.isEmpty() then 'characterwise'
      else null

swrap = (selection) ->
  new SelectionWrapper(selection)

swrap.init = ->
  SelectionWrapper.init()

swrap.setReversedState = (editor, reversed) ->
  editor.getSelections().forEach (selection) ->
    swrap(selection).setReversedState(reversed)

swrap.expandOverLine = (editor, options) ->
  editor.getSelections().forEach (selection) ->
    swrap(selection).expandOverLine(options)

swrap.reverse = (editor) ->
  editor.getSelections().forEach (selection) ->
    swrap(selection).reverse()

swrap.resetProperties = (editor) ->
  editor.getSelections().forEach (selection) ->
    swrap(selection).resetProperties()

swrap.detectVisualModeSubmode = (editor) ->
  selections = editor.getSelections()
  results = (swrap(selection).detectVisualModeSubmode() for selection in selections)

  if results.every((r) -> r is 'linewise')
    'linewise'
  else if results.some((r) -> r is 'characterwise')
    'characterwise'
  else
    null

module.exports = swrap
