{Range} = require 'atom'
_ = require 'underscore-plus'

{sortRanges} = require './utils'
swrap = require './selection-wrapper'

class BlockwiseSelection
  constructor: (selection) ->
    {@editor} = selection
    @initialize(selection)

  initialize: (selection) ->
    @selections = [selection]
    wasReversed = reversed = selection.isReversed()

    # If selection is single line we don't need to add selection.
    # This tweeking allow find-and-replace:select-next then ctrl-v, I(or A) flow work.
    unless selection.isSingleScreenLine()
      range = selection.getScreenRange()
      if range.start.column >= range.end.column
        reversed = not reversed
        range = range.translate([0, 1], [0, -1])

      {start, end} = range
      ranges = [start.row..end.row].map (row) ->
        [[row, start.column], [row, end.column]]

      selection.setBufferRange(ranges.shift(), {reversed})
      newSelections = ranges.map (range) =>
        @editor.addSelectionForScreenRange(range, {reversed})
      for selection in newSelections
        if selection.isEmpty()
          selection.destroy()
        else
          @selections.push(selection)
    @updateProperties()
    @reverse() if wasReversed

  updateProperties: ->
    head = @getHead()
    tail = @getTail()

    for selection in @selections
      swrap(selection).setProperties
        blockwise:
          head: selection is head
          tail: selection is tail

  isSingleLine: ->
    @selections.length is 1

  getHeight: ->
    [startRow, endRow] = @getBufferRowRange()
    (endRow - startRow) + 1

  getTop: ->
    @selections[0]

  getBottom: ->
    _.last(@selections)

  isReversed: ->
    if @isSingleLine() then false else swrap(@getBottom()).isBlockwiseTail()

  getHead: ->
    if @isReversed() then @getTop() else @getBottom()

  getTail: ->
    if @isReversed() then @getBottom() else @getTop()

  reverse: ->
    return if @isSingleLine()
    head = @getHead()
    tail = @getTail()
    swrap(head).setProperties(blockwise: head: false, tail: true)
    swrap(tail).setProperties(blockwise: head: true, tail: false)

  getBufferRowRange: ->
    startRow = @getTop().getBufferRowRange()[0]
    endRow = @getBottom().getBufferRowRange()[0]
    [startRow, endRow]

  setBufferPosition: (point) ->
    head = @getHead()
    @clearSelections(except: head)
    head.cursor.setBufferPosition(point)

  headReversedStateIsInSync: ->
    @isReversed() is @getHead().isReversed()

  setSelectedBufferRanges: (ranges, {reversed}) ->
    sortRanges(ranges)
    range = ranges.shift()
    @setHeadBufferRange(range, {reversed})
    for range in ranges
      @selections.push @editor.addSelectionForScreenRange(range, {reversed})
    @updateProperties()

  setBufferRange: (range) ->
    head = @getHead()
    reversed = if @headReversedStateIsInSync()
      head.isReversed()
    else
      not head.isReversed()
    @setHeadBufferRange(range, {reversed})
    @initialize(head)

  getBufferRange: ->
    start = @getHead().getHeadBufferPosition()
    end = @getTail().getTailBufferPosition()
    if @headReversedStateIsInSync()
      new Range(start, end)
    else
      new Range(start, end).translate([0, -1], [0, +1])

  # which must be 'start' or 'end'
  setPositionForSelections: (which) ->
    for selection in @selections
      point = selection.getBufferRange()[which]
      selection.cursor.setBufferPosition(point)

  moveSelection: (direction) ->
    isExpanding = =>
      return true if @isSingleLine()
      switch direction
        when 'down' then not @isReversed()
        when 'up' then @isReversed()

    if isExpanding()
      switch direction
        when 'up'
          @getTop().addSelectionAbove()
          @selections.unshift(selection = @editor.getLastSelection())
        when 'down'
          @getBottom().addSelectionBelow()
          @selections.push(selection = @editor.getLastSelection())
      swrap(selection).setReversedState(@getTail().isReversed())
    else
      @removeSelection(@getHead())
    @updateProperties()

  clearSelections: ({except}={}) ->
    for selection in @selections.slice() when (selection isnt except)
      @removeSelection(selection)

  removeSelection: (selection) ->
    _.remove(@selections, selection)
    selection.destroy()

  setHeadBufferRange: (range, options) ->
    head = @getHead()
    @clearSelections(except: @getHead())
    swrap(head).resetProperties()
    head.setBufferRange(range, options)

  restoreCharacterwise: ->
    @setHeadBufferRange(@getBufferRange(), reversed: @isReversed())

module.exports = BlockwiseSelection
