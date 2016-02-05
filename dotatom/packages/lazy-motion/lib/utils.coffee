{Range} = require 'atom'
_ = require 'underscore-plus'

getView = (model) ->
  atom.views.getView(model)

# Return function to restore editor's scrollTop and fold state.
saveEditorState = (editor) ->
  editorElement = getView(editor)
  scrollTop = editorElement.getScrollTop()
  foldStartRows = editor.displayBuffer.findFoldMarkers({}).map (marker) ->
    editor.displayBuffer.foldForMarker(marker).getStartRow()
  ->
    for row in foldStartRows.reverse() when not editor.isFoldedAtBufferRow(row)
      editor.foldBufferRow row
    editorElement.setScrollTop scrollTop

# Return adjusted index fit whitin length
# Return -1 if list is empty.
getIndex = (index, list) ->
  if list.length is 0
    -1
  else
    index = index % list.length
    if (index >= 0)
      index
    else
      list.length + index

getVisibleBufferRange = (editor) ->
  [startRow, endRow] = getVisibleBufferRowRange(editor)
  new Range([startRow, 0], [endRow, Infinity])

getVisibleBufferRowRange = (editor) ->
  [startRow, endRow] = getView(editor).getVisibleRowRange().map (row) ->
    editor.bufferRowForScreenRow row

# NOTE: depending on getVisibleRowRange
selectVisibleBy = (editor, entries, fn) ->
  range = getVisibleBufferRange(editor)
  (e for e in entries when range.containsRange(fn(e)))

getHistoryManager = ({max}={}) ->
  entries = []
  index = -1
  max ?= 20

  get: (direction) ->
    switch direction
      when 'prev' then index += 1 unless (index + 1) is entries.length
      when 'next' then index -= 1 unless (index is -1)
    entries[index] ? ''

  save: (entry) ->
    return if _.isEmpty(entry)
    entries.unshift entry
    entries = _.uniq(entries) # Eliminate duplicates
    if entries.length > max
      entries.splice(max)

  reset: ->
    index = -1

  destroy: ->
    {entries, index} = {}

flash = (editor, range, options) ->
  marker = editor.markBufferRange range,
    invalidate: 'never'
    persistent: false

  editor.decorateMarker marker,
    type: 'highlight'
    class: options.class

  setTimeout ->
    marker.destroy()
  , options.timeout

flashScreen = (editor, options) ->
  flash(editor, getVisibleBufferRange(editor), options)

module.exports = {
  saveEditorState
  getVisibleBufferRange
  getVisibleBufferRowRange
  getIndex
  getView
  selectVisibleBy
  getHistoryManager
  flash
  flashScreen
}
