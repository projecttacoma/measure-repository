FROM node:18 AS base

FROM base AS deps

# Run a custom ssl_setup script if available
COPY ./docker_ssl_setup.sh* ./
RUN chmod +x ./docker_ssl_setup.sh; exit 0
RUN ./docker_ssl_setup.sh; exit 0
ENV NODE_EXTRA_CA_CERTS="/etc/ssl/certs/ca-certificates.crt"

# We're using this because root user can't run any post-install scripts
USER node
WORKDIR /home/node/app

# Copy just package and package.lock of all parts of the project for just grabbing deps
COPY --chown=node:node package.json package-lock.json ./
RUN mkdir app
COPY --chown=node:node app/package.json ./app/
RUN mkdir service
COPY --chown=node:node service/package.json ./service/
# Install dependencies
RUN npm install


FROM deps AS build

# copy over all source and build just app
COPY --chown=node:node service service
COPY --chown=node:node tsconfig-base.json .
RUN npm run build --workspace=service

RUN rm -rf node_modules

RUN npm prune --omit=dev

FROM node:18-slim AS runner

USER node
WORKDIR /home/node/app
RUN mkdir node_modules
RUN chown node:node node_modules

COPY --from=build --chown=node:node /home/node/app/service/dist* ./dist
COPY --from=build --chown=node:node /home/node/app/node_modules ./node_modules


# Start app
EXPOSE 3000
ENV PORT=3000
ENV HOST="0.0.0.0"
CMD [ "node", "dist/index.js"]
