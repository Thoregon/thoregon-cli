CLI
===

`
$ npm install -g thoregon-cli
`
You can  also use other package managers
`
$ yarn add global thoregon-cli
$ pnpm add --global thoregon-cli
`

Usage:
thor ... thoregon master control cli

`
$ thor <command> [options] [params]
`

## CLI Base
After installing the CLI, only a limited set of commands are available.

- install ... a thoregon node
    - local node
    - local dev node
    - name it, generate id
- join ... thoregon node to your galaxy
- vault ... manage keypairs and certs 
- signon ... signon with a SSI
- galors  (limited functions)

Development
! caution: there is no server and no client code !
Even if there is a dev server, there is 

- new ... quickly scaffold components
    - app     ... scaffold component structure with UI
    - service ... scaffold component structure w/o UI
- deploy ... builds a package and deploys it into the universe
    - omits directories 'doc', 'node_modules' and 'tests' 
    - uses 'thoregon.mjs' as component descriptor, describes all dependencies (repo/component/version)
    - uses builder hooks if defined (in package.json)
    - deploys a signed component package -> developer keypair needed!
- deploy node_modules
    - from dist
    - browser/node/es6 version and entry point
 
To use the whole CLI, a Thoregon (peer) must be installed. This can be done using the 'install' command.

Note: the CLI can be extended also by components which are installed later.  
The Commands itself are implemented as components, using the tru4D infrastructure.

The CLI is a minified Thoregon peer, comprised of a limmited set of components.

With the CLI you can manage your whole galaxy. 

## Commands

### install
Runs the install process. you will be asked for options

- peer: give the peer a name, an id will be generated. 
    the name will then be registered at the name service. the name must be located in your __galaxy__
    cli option: -p --peer
- domain: the domain if you want to publish an API to the web
    

### start


### stop


### vault

### galors

Explore, Measure, Profile the universe

### dorifer

Register an entity

#### components

deploy components as package:
- LICENCE.md, README.md
- index*.mjs
- lib/
- ui*/
- wrap with ES6 export

shortcut 'cmp'


## Extensions

The CLI can also be extended by components installed.

