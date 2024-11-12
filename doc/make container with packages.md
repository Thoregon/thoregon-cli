# Containers and Packages

## Server Structure

-- set UPAYME_HOME = '~';

Directories:
- bin ... admin and maintenance scripts
- images ... contains a directory for each image to be created
- compose ... contains a directory for each stack, in this case there is a compose for upay.me containers (nexus, resource, caddy) and for each vendor 
- container ... contains file mappings for localstore, data, and config 
- www ... static file server caddy, contains a config for each container (nexus, portal, each vendor)
- agent ... (all) modules from agents


Port Mappings for containers. Maps to REST API's from services: 
30000 ... nexus
3010n ... vendor containers

## Update 

update the upayme software:

### Test


### Prod


## uPay Me images, containers and apps

images:
- upaymenexus ... for upay.me nexus container: portalservice, identityservice, affiliateservices, and upay.me admin
- upaymeagent ... used for all vendor containers: 

on the target server following agents will be deployed:
- nexus ... the agent for upay.me administration
- upayme ... agent for each vendor. there is at least one vendor for upay.me itself

the UI will be deployed as config only. all UI's will use the same file location.
for each UI a (sub) domain entry for caddy will be defined.

### Images & Compose

build a docker image for all agents
    
Current build context: ~/container/upaymeagent

````
docker build -t upaymeagent .
# -t myimage   name the image
# . context of the build
````


### Target Server

login, pwd -> /home/lucky
````
cd upaymetest (upaymeprod)
cd agent
mkdir nexus
mkdir <vendorid> (name)
````

create in upaymenexus and upayme<vendorid>
````
mkdir .thoregon
mkdir etc
mkdir data
mkdir www
````

### Nexus

- first create the nexus service agent config
    - generate unique peer id -> etc/peer.mjs
    - generate unique ids for all exposed services: /etc/agent_sources.mjs
    - copy ids for all exposed services to ui/utc: /etc/services.mjs  

````
````


### Vendors

create container config for vendor service agent
- sa/etc
  - generate unique peer id -> etc/peer.mjs
  -  
- ui/etc
  - account.mjs
  - services.mjs
  - knownpeers.mjs  ... must contain the peerid from nexus and the peerid from vendor agent
  - additional config should be just copied (universe.config.mjs, widgets.mjs, resourcesink.mjs)

each vendor will get ist own container running the service agent
and a (sub)domain with ist own /etc for the config 

**ReverseProxy** for services

replacte ${vendor} with vendors subdomain
replace ${sa_port} to specific service agent

````
${vendor}.upay.me {
    root * /www/upaymeui
    uri replace /etc/ /.etc/upayme/                 # config for domain
    reverse_proxy /content/* localhost:${sa_port}   # port to the vendors service agent
    file_server
    handle_errors {
        rewrite * /404-notfound.html
        file_server
    }
}
````

## Thoregon CLI

````
thor thoregon -k node
thor thoregon -k browser

thor pack -m -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/modules upaymemodules
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/services/easypay-service upaymeservices
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/services/paymentprocessors upaymepaymentprocessors
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/home/easypay-home upaymehome

thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard upayme-application-dashboard
# thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-checkout upayme-application-checkout

thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/styles/upayme-style-customer upayme-style-customer
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard upayme-ui-dashboard
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-checkout upayme-ui-checkout

````
## upay.me Agent


````
thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard upayme-application-dashboard
thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-nexus upayme-application-nexus

thor app  -a /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_ui  upaymeui
thor deployui -d <vendirid>.upay.me -c upaymeui upaymeui
````


## Stripe/Paypal Receiver

````
thor pack -i ./testidentity.mjs -p /paymentprocessors/stripe /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/services/paymentprocessors/stripe upaymestripe

thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/ThoregonUniverse/terra.modules/terra.stripe terrastripe

thor agent -c upaymemodules upaymepaymentprocessors -i ./testidentity.mjs stripereceiver

# modify:
thor agentadd -c upaymehome -i ./testidentity.mjs stripereceiver
thor agentadd -c easypay-application-dashboard -i ./testidentity.mjs stripereceiver
thor agentadd -c upaymestripe -i ./testidentity.mjs stripereceiver
````

## NEXUS
````
thor pack -m -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/nexusmodules upaymenexusmodules
thor pack -m -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/nexusservices upaymenexusservices
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/home/nexus-home upaymenexushome
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/modules/upayme-module-nexusapi upaymenexusapi

thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-affiliate upayme-application-affiliate
thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-accountportal upayme-application-accountportal
thor pack -i ./testidentity.mjs --no-ui --no-assets /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-nexus upayme-application-nexus

thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/styles/upayme-style-nexus upayme-style-nexus
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-affiliate upayme-ui-affiliate
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-accountportal upayme-ui-accountportal
thor pack -i ./testidentity.mjs /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-nexus upayme-ui-nexus

# Nexus Agent
thor agent -i ./testidentity.mjs -a /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_agent_nexus upaymeagentnexus
thor deploy -c upaymeagentnexus -n /Users/bernhardlukassen/Documents/dev/Projects/ThoregonUniverse/Thoregon/data/neuland.tdb upaymeagentnexus

# Nexus UI
thor app  -a /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_nexus_ui  upaymenexusui
thor deployui -d nexus.upay.me -c upaymnexuseui upaymenexusui

````

# create ui container with app
````
thor app  -a /Users/bernhardlukassen/Documents/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_ui  upaymeui

thor deployui -d erikawest.upay.me -c upaymeui upaymeerikawest
````
# (re)create repo entries for a app (UI)
````
thor repo upaymeui upayme-application-dashboard upaymehome upaymemodules
````

# --------

# todo: Merge packages into one big
````
thor merge upayme ./dist/packages/upaymehome.zip ./dist/packages/upaymemodules.zip
````

## Identities

create new identity file:

````Javascript
// create key pairs:
const pairs = await universe.everblack.pair({ rsa:true });
// create anchor:
const salt = universe.random(9);
// create anchor:
const anchor = universe.random();

const identity = {
    alias : '<identityalias>',
    pairs,
    salt,
    anchor
}
````

now create the identiy file:
````Javascript
const json = JSON.stringify(identiy, null, 3);
// write to file
````
## Updates b4 building containers

unpack sources for agents
````
thor unpack -o ~/deploy/agent ~/dist/thoregon/thoregonN.neuarch.gz
thor unpack -o ~/deploy/agent ~/dist/packages/upayme-application-dashboard.neuarch.gz
...
````

**check for Agents**
/Thoregon                  <->     /thoregon-cli/templates
    thoregonsystem.mjs
    universe.config.mjs
    genesis.mjs


**check for UI**
/Puls                      <->     /thoregon-cli/templatesui
    /ext                   <->     /ext
    /lib                   <->     /lib
    /tdev                  <->     /tdev
    thoregonsystem.mjs
    genesis.mjs
    hatch.mjs
    puls.mjs
    pulssw.mjs
    repos.mjs   ... will be adjusted by the ui container build: app components as NEULAND repo entries          
    thoregon.html
    thoregonsystem.mjs
    universe.config.mjs

## Settings

### WWW Packages

if any new package was created and is needed for UI add it to the app definition in:
```
<wwroot>/apps/appmodules.js
```

### Replacements

- peer.mjs ... contains the peer id. service agents only (to find it), UIs just use a random one
- knownpeers.mjs ... known peer ids to use for discover
- resourcesink.mjs ... the sink to store resources
- universe.config.,js
  - define agent name (for agents)
  - (HTTPFILESINK comes from  resourcesink.mjs)
- vapid.json ... if post messages is supported add the vapid keys 

### App Specific

- repos.mjs ... adjust with ui components 
- neuland.tdb

- checkout page with **service id**, get rid of the checkout page builder
- widgets.mjs ... adjust URLs for iframe

!!! this is in the vendor settings !!!
( stripeini.mjs, paypalini.mjs )

- REST (Web) endpoint for agents (e.g. checkout page)

## uPayMe

- resourceserver for each vendor
- ui server for each vendor
- service agent for each vendor
