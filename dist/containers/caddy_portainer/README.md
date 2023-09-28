# Caddy Reverse Proxy with Portainer

- make directory for caddy container (change useranme!) for caddy_data
````sh
    $ mkdir -p /home/<usr>/containers/caddy
````
- edit caddyfile, use your domains 
- copy 'Caddyfile'
  ! CAUTION: the port in Caddyfile directly maps the the port in the container (9000), not to the forwarded port (9010)
- make directory for caddy compose (change useranme!)
````sh
   $ mkdir -p /home/<usr>/compose/caddy
````
- edit  caddy_portainer 'docker-compose.yaml' (change useranme!)
- copy 'docker-compose.yaml' to /home/<usr>/compose/caddy
- make directory for portainer container (change useranme!) for portainer_data
````sh
  > mkdir -p /home/<usr>/containers/portainer
````
````sh
  > cd /home/<usr>/compose/caddy  
  > docker compose up -d 
````

- reverse proxy (caddy) with portainer
  - https://gist.github.com/BlueHippoGithub/1a6b6569cea8520ea5b6119e8877c70a (edit)
  - https://www.youtube.com/watch?v=qj45uHP7Jmo

## Caddy
- https://caddyserver.com
  - https://caddyserver.com/docs/quick-starts/reverse-proxy
- https://www.youtube.com/watch?v=qj45uHP7Jmo

## Portainer
- https://portainer.io
- https://docs.portainer.io/start/install-ce
- https://www.youtube.com/watch?v=WGf-bCiW1Q0&list=PLJ8Zr4KzJy8SkJzWkKtsdx3Z-6H7rhbd5&index=1
