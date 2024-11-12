# Add new Vendor upay.me instance

- nexus create IdentityCard

## Vendor Credentials

- account.mjs
  - company/vendor name
  - domain
  - version

### Agent

- docker-compose.yml
  - container name 
  - port
- etc directory
  - create identity (from nexus) 
  - universe.config, adjust settings:
  - universe.prod
  - copy account.mjs
- data directory

### Client
- etc directory
  - copy account.mjs
  - universe.remote.config.mjs
  - universe.prod.mjs

# Server Structure

- create container
  - directories
  - docker compose config
    - define directories
  - upayme config
  - Caddy config
    - import agents-enabled/*
