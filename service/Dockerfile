FROM node:18 as base

FROM base as deps

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


FROM deps as build

# copy over all source and build just app
COPY --chown=node:node service service
COPY --chown=node:node tsconfig-base.json .
RUN npm run build --workspace=service
RUN npm run db:setup --workspace=service

FROM build as runner

# Start app
EXPOSE 3000
ENV PORT 3000
ENV HOST "0.0.0.0"
CMD [ "npm", "start", "--workspace=service"]
