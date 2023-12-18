# Measure Repository

A prototype implementation of a [FHIR Measure Repository Service](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html) and associated frontend application. This repository is a monorepo that consists of: 
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
git clone https://github.com/projecttacoma/measure-repository-service.git
```

This repository uses [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces), so in order to install all dependencies, run the following:

```bash
npm install
```

If you want to install a dependency in only the `app` or the `service` directory, run the following:

```bash
npm install --workspace=<app-or-service> <package-name>
```

Copy `app/.env.example` to `app/.env.local` and `service/.env.example` to `service/.env`. Make any changes to point to the measure repository service, Mongo database, and optionally the VSAC API. `0.0.0.0` may be a more appropriate database address than `localhost` for certain environment setups.

## Usage

Once you have the necessary dependencies installed, you can run the following in the root directory:

To start the app and repository service in parallel:

```bash
npm run start:all
```

This starts up the Measure Repository service at `localhost:3000` and you can open the Measure Repository Service frontend application by navigating to http://localhost:3001 in your browser.

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
### Docker

To start the app and repository service in parallel, run 

```bash
docker compose up
```

## License

Copyright 2022-2023 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
