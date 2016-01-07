# jsdifflib

A javascript library for diffing text and generating corresponding HTML views.  This is a fork of [cemerick/jsdifflib](https://github.com/cemerick/jsdifflib) which has been updated for use with browserify and node.js

[![NPM version](https://badge.fury.io/js/jsdifflib.png)](http://badge.fury.io/js/jsdifflib)

## Installation

    npm install jsdifflib

## Overview

jsdifflib is a Javascript library that provides:

1. a partial reimplementation of Python’s difflib module (specifically, the SequenceMatcher class)
2. a visual diff view generator, that offers side-by-side as well as inline formatting of file data

It puts data in a simple table that can be easilly re-styled using CSS

jsdifflib does not require jQuery or any other Javascript library.

## Example

```js
var difflib = require('jsdifflib');

function getDiff(baseTextRaw, newTextRaw) {
  // build the diff view and return a DOM node
  return diffview.buildView({
      baseText: baseText,
      newText: newText,
      // set the display titles for each resource
      baseTextName: "Base Text",
      newTextName: "New Text",
      contextSize: 10,
      //set inine to true if you want inline
      //rather than side by side diff
      inline: true
  });
}

document.body.appendChild(getDiff('source', 'destination'));
```

## License

  BSD