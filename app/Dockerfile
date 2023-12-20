FROM node:18 as base

FROM base as deps

# TODO: need to mkdir? need different dir from frontend

# COPY ../tsconfig-base.json ./
# TODO: do we still need this? ...probably for MITRE systems
# Run a custom ssl_setup script if available
# We need to copy package.json here as it allows us to conditionally copy the setup script
COPY package.json ./docker_ssl_setup.sh* ./
RUN chmod +x ./docker_ssl_setup.sh; exit 0
RUN ./docker_ssl_setup.sh; exit 0
ENV NODE_EXTRA_CA_CERTS="/etc/ssl/certs/ca-certificates.crt"

# We're using this because root user can't run any post-install scripts
USER node
WORKDIR /home/node/app
# Copy just package and package.lock
COPY --chown=node:node package.json package-lock.json ./
RUN mkdir app
COPY --chown=node:node app/package.json ./app/
RUN mkdir service
COPY --chown=node:node service/package.json ./service/
# Install dependencies
RUN npm install

FROM deps as build

COPY --chown=node:node . .
RUN npm run build --workspace=app

FROM build as runner

# Start app
EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"
CMD [ "npm", "start", "--workspace=app"]
