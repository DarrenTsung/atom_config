# atom-config-plus

`atom-config-plus` is simple wrapper for `atom.config` of [Atom](https://atom.io/).

This not atom package.  
This is node module(=library) intending to be used from your [Atom](https://atom.io/) package.  

# Install

* In your Package directory

```
npm install --save atom-config-plus
```

# Use in your package source.

```coffeescript
ConfigPlus = require 'atom-config-plus'

config =
  paramString:
    type: 'string'
    default: 'foo'
  paramBoolean:
    type: 'boolean'
    default: false

settings = new ConfigPlus('your-package', config)

module.exports =
  config: settings.config

  activate: (state) ->
    # Equivalent to `atom.cofig.get 'your-package.paramString`'
    settings.get 'paramString' # => foo

    settings.set 'paramString', 'bar'
    settings.get 'paramString' # => bar

    settings.get 'paramBoolean' # => false
    settings.toggle 'paramBoolean'
    settings.get 'paramBoolean' # => true
    settings.toggle 'paramBoolean', log: true
      # => console.log your-package.paramBoolean: false

  deactivate: ->
    settings.dispose()
```

## Or settings required from multiple files.

* settings.coffee

```coffeescript
ConfigPlus = require 'atom-config-plus'

config =
  paramString:
    type: 'string'
    default: 'foo'
  paramBoolean:
    type: 'boolean'
    default: false

module.exports = new ConfigPlus('your-package', config)
```

* main.coffee

```coffeescript
settings = require './settings'

module.exports =
  config: settings.config

  activate: (state) ->
    settings.get 'paramString' # => foo
    settings.set 'paramString', 'bar'
    settings.get 'paramString' # => bar

    settings.get    'paramBoolean' # => false
    settings.toggle 'paramBoolean'
    settings.get    'paramBoolean' # => true
    settings.log    'paramBoolean'
      # => console.log your-package.paramBoolean: true
    settings.toggle 'paramBoolean', log: true
      # => console.log your-package.paramBoolean: false

  deactivate: ->
    settings.dispose()
```

* other.coffee

```coffeescript
settings = require './settings'
```
