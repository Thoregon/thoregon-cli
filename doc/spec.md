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
`
$ thoregon <command> [options] [params]
`
## CLI Base
After installing the CLI, only a limited set of commands are available.

- install
- vault
- signon
- karte  (limited functions)
 
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

### karte

Register a galaxy 

### components

shortcut 'cmp'


## Extensions

The CLI can also be extended by components installed.

