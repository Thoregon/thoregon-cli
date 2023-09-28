# podman build -t thoregon/thoregon:0.1  https://github.com/Thoregon/Puls.Container.git
# docker run -i -t localhost/thoregon/thoregon:0.1
FROM node:18-alpine
RUN apk add dumb-init
ENV NODE_ENV production
# ENV THOREGON_SRC https://lightningleds.com/data/thoregon.zip
# RUN addgroup thoregon
# RUN adduser --system --ingroup thoregon --no-create-home thoregon
WORKDIR /thoregon
# COPY --chown=thoregon:thoregon . .
COPY . .
# RUN npm ci --only=production
# USER thoregon
CMD ["dumb-init", "node", " --experimental-fetch", "--experimental-loader", "./modules/evolux.universe/bootloader.mjs", "thoregon.mjs" ]
