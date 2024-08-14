# Measure Repository

A prototype implementation of a [FHIR Measure Repository Service](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html) and associated frontend application. The Measure Repository Service is a specific case of the more general [Artifact Repository Service](https://hl7.org/fhir/uv/crmi/artifact-repository-service.html#artifact-repository-service) that supports measures and libraries that exist in the CRMI Artifact Lifecycle as [CRMIShareableMeasure](https://hl7.org/fhir/uv/crmi/StructureDefinition-crmi-shareablemeasure.html) and [CRMIShareableLibrary](https://hl7.org/fhir/uv/crmi/StructureDefinition-crmi-shareablelibrary.html) artifacts. This repository is a monorepo that consists of:

- [Measure Repository Service](https://github.com/projecttacoma/measure-repository/blob/main/service/README.md)
  - Implements portions of the [FHIR Measure Repository Service](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html) specification
  - Acts as a FHIR server and shared source of truth for measures and libraries
- [Measure Repository App](https://github.com/projecttacoma/measure-repository/blob/main/app/README.md)
  - A prototype [Next.js](https://nextjs.org/) application that demonstrates potential interactions with a FHIR Measure Repository Service
  - Includes a frontend, backend, and small database which acts as in-progress storage space for drafting measures and libraries

![Screenshot of Measure Repository and App Interaction](./MRS-diagram.png)

## Installation

### Local Installation

Clone the source code:

```bash
git clone https://github.com/projecttacoma/measure-repository.git
```

This repository uses [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces), so in order to install all dependencies, run the following:

```bash
npm install
```

If you want to install a dependency in only the `app` or the `service` directory, run the following:

```bash
npm install --workspace=<app-or-service> <package-name>
```

Make a copy of `.env` files:

```bash
cp app/.env.example app/.env.local
```

```bash
cp service/.env.example service/.env
```

Make any changes to point to the measure repository service, Mongo database, and optionally the VSAC API. `0.0.0.0` may be a more appropriate database address than `localhost` for certain environment setups.
Additionally, some versions of tooling may have issues with running `next dev` within workspaces. Disabling telemetry can prevent the disallowed npm command from running under the hood.

```bash
npx next telemetry disable
```

### Mongo Replica Set Setup

Use the mongodb configuration file to configure the single node replica set. For more information about the configuration file and system location, see the mongodb [configuration file documentation](https://www.mongodb.com/docs/manual/reference/configuration-options/).

1. First shutdown any currently running mongodb standalone instances: `brew services stop mongodb-community`.
2. Locate your [Mongo Configuration File](https://www.mongodb.com/docs/manual/reference/configuration-options/). _System dependent but may be found at `/opt/homebrew/etc/mongod.conf`_.
3. Add this replication set configuration to the mongo configuration file:

```
replication:
   replSetName: rs0
```

4. Start mongodb again using homebrew: `brew services restart mongodb-community`.
5. Initialize the replica set using mongosh:

```bash
mongosh
```

```bash
rs.initiate()
```

6. From here you can continue to use the replica set, and in the future, you can do a normal start of the server using homebrew: `brew services start mongodb-community` (without need to reinitialize the replica set).

Further information on standalone to replica set conversion can be found in the mongodb [replica set conversion documentation](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/).

## Usage

Once you have the necessary dependencies installed, you can run the following in the root directory:

To start the app and repository service in parallel:

```bash
npm run start:all
```

This starts up the Measure Repository service at `localhost:3000` and you can open the Measure Repository Service frontend application by navigating to http://localhost:3001/mrs in your browser.

To start only the frontend:

```bash
npm run start:app
```

To start only the backend:

```bash
npm run start:service
```

To run `lint` and `prettier` in both the frontend and backend and unit tests in the backend:

```bash
npm run check:all
```

> Note: You may receive a workspace error. This does not prevent the service from running, to remove the error for future builds, run `npx next telemetry disable`

### Docker

To start the app and repository service in parallel, run

```bash
docker compose up --build
```

#### Deploying/Running with Docker Prebuilt Images

If you wish to run pre-built images from [Docker Hub](https://hub.docker.com/u/tacoma), create a `docker-compose.yml` in your environment with the content in `docker-compose.example.yml`.

Make sure to change the `PUBLIC_MRS_SERVER` environment variable in this file to match the location of where the FHIR server application will be accessible, this will be `http://localhost:3000/4_0_1` when connecting directly to the container running locally.

When configuring an application proxy for this, make sure the `app` is routed to `/mrs` instead of the root of the server.

#### Building new Docker Images

If you have permission to push to the tacoma organization on Docker Hub, simply run `docker-build.sh` to build a multi-platform image and push to docker hub tagged as `latest`.

## License

Copyright 2022-2024 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
