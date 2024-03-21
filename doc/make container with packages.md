# Containers and Packages

## Thoregon CLI

````
thor thoregon -k node
thor thoregon -k browser

thor pack -m -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/modules upaymemodules
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/services/easypay-service upaymeservices
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/services/paymentprocessors upaymepaymentprocessors
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/home/easypay-home upaymehome
thor pack -i ./testidentity.mjs --no-ui --no-assets /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard upayme-application-dashboard
# thor pack -i ./testidentity.mjs --no-ui --no-assets /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-checkout upayme-application-checkout

thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard upayme-ui-dashboard
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-checkout upayme-ui-checkout

thor pack -i ./testidentity.mjs /private/var/dev/Projects/ThoregonUniverse/terra.modules/terra.stripe terrastripe

thor agent -c upaymemodules upaymepaymentprocessors -i ./testidentity.mjs stripereceiver

thor agentadd -c upaymehome -i ./testidentity.mjs stripereceiver
thor agentadd -c easypay-application-dashboard -i ./testidentity.mjs stripereceiver
````

# ---------

````
thor pack -i ./testidentity.mjs -p /paymentprocessors/stripe /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/services/paymentprocessors/stripe upaymestripe
thor agentadd -c upaymestripe -i ./testidentity.mjs stripereceiver
````

# create ui container with app
````
thor app  -a /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_ui  upaymeui

thor deployui -d test.upay.me -c upaymeui upaymeui
````
# (re)create repo entries for a app (UI)
````
thor repo upaymeui upayme-application-dashboard upaymehome upaymemodules
````

# ---------
# NEXUS
````
thor pack -m -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/nexusmodules upaymenexusmodules
thor pack -m -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/nexusservices upaymenexusservices
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/home/nexus-home upaymenexushome
thor pack -i ./testidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/modules/upayme-module-nexusapi upaymenexusapi

thor pack -i ./testidentity.mjs --no-ui --no-assets /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/upayme-application-nexus upayme-application-nexus

thor agent -i ./testidentity.mjs -a /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/agents/upayme_agent_nexus upaymeagentnexus

thor deploy -c upaymeagentnexus -n /private/var/dev/Projects/ThoregonUniverse/Thoregon/data/neuland.tdb upaymeagentnexus
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
