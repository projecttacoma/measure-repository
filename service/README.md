# Measure Repository Service

A prototype implementation of a [FHIR Measure Repository Service](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html)

## Installation

### Prerequisites

- [Node.js >=18.0.0](https://nodejs.org/en/)
- [MongoDB >= 6.0](https://www.mongodb.com)

### Local Installation

Install dependencies:

At the root directory:

```bash
npm install
```

This repository uses [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces), so if you want to install a dependency in this directory, you have to run the following from the root directory:

```bash
npm install --workspace=service <package-name>
```

### MongoDB

This test server makes use of [MongoDB](https://www.mongodb.com), a cross-platform document-oriented database program.

Follow the [MongoDB Community Edition installation guide](https://docs.mongodb.com/manual/installation/) for your platform, and follow the commands for running MongoDB on your machine.

### First time Database Setup

This server comes with a script to create collections for FHIR Measure, Library, and MeasureReport resources which will be used by the measure repository service.
To create these collections:

```
npm run db:setup
```

To clear the database and regenerate empty FHIR Measure, Library, and MeasureReport collections, run:

```
npm run db:reset
```

To load a measure bundle and related library artifacts, run:

```
npm run db:loadBundle <path to measure bundle>
```

To load multiple bundles from a directory, run the same script with the desired directory path:

```
npm run db:loadBundle <path to directory>
```

### Bundle Upload Details

Upon uploading a Measure resource, the Measure's main library is added to the `relatedArtifact` array with an [isOwned extension](https://build.fhir.org/ig/HL7/fhir-extensions/StructureDefinition-artifact-isOwned.html).

Note that the measure repository service only supports Measure and Library resources. All other resource types will be ignored during bundle upload.

If a resource does not have an id, it will be assigned a unique id during the upload process. If a resource is not in `active` status, it will be coerced to `active`.

### Transaction Bundle Upload

The server supports transaction bundle uploads via the `:/base_version/` endpoint (ex. `/4_0_1/`).

- The request method must be `POST`.
- The request body must be a FHIR bundle of type `transaction`.
- The entries SHALL be of resource type "Measure" or "Library." An error will be thrown otherwise.

For ease of use, the `service/directory-upload.sh` script can be used to run the transaction bundle upload on an input directory. Details are as follows:

- The `-h` option can be used to view usage.
- A server URL must be supplied via the `-s` option.
- A directory path must be supplied via the `-d` option.
- The script can support nested directories (one level deep).

## Usage

Once MongoDB is running on your machine, run the `npm start` command in this directory to start up the Measure Repository Service server at `localhost:3000`.

You can also start the Measure Repository Service server in the root directory by running the `npm run start:service` command.

You can also run `npm run start:clean`, which will reset the database before starting up the Measure Repository Service server.

For ease of testing, it is recommended to download [Insomnia API Client and Design Tool](https://insomnia.rest) for sending HTTP requests to the server and [Robo 3T](https://robomongo.org) as a GUI for viewing the Mongo database.

When sending requests, ensure that the `"Content-type": "application/json+fhir"` header is set.

### CRUD Operations

This server currently supports the following CRUD operations:

- Read by ID with `GET` to endpoint: `4_0_1/<resourceType>/<resourceId>`
- Create resource (Library or Measure) with `POST` to endpoint: `4_0_1/<resourceType>`
- Update resource (Library or Measure) with `PUT` to endpoint: `4_0_1/<resourceType>/<resourceId>`
  _More functionality coming soon!_

### Search

The Measure Repository Service server supports `Library` and `Measure` resource search by the parameters specified in the shareable measure repository section of the [HL7 Measure Repository Docs](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#shareable-measure-repository). These parameters are:

- description
- identifier
- name
- status
- title
- url
- version (can appear only in combination with a url search)

The Measure Repository Service server also supports the `_summary` and `_elements` search parameters.

The `_summary` parameter is specified in the [HL7 FHIR Search Docs](https://www.hl7.org/fhir/search.html#_summary). The server currently supports the following `_summary` parameter values:

- count

The `_elements` parameter is specified in the [HL7 FHIR Search Docs](https://www.hl7.org/fhir/search.html#_elements) and supports a comma-separated list of base element names.

### Package

The Measure Repository Service server supports the `Library` and `Measure` `$cqfm-package` operation with the `id` and `identifier` parameters and SHALL parameters specified in the shareable measure repository section of the [HL7 Measure Repository Docs](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#publishable-measure-repository). Accepted parameters are:

- id
- url
- identifier
- version

See the [`$cqfm-package` OperationDefinition](http://hl7.org/fhir/us/cqfmeasures/STU4/OperationDefinition-cqfm-package.html) for more information.

### Data Requirements

The Measure Repository Service server supports the `Measure` and `Library` `$data-requirements` operations with the SHALL parameters specified in the publishable measure repository section of the [HL7 Measure Repository Docs](http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#publishable-measure-repository). SHALL parameters are:

- id
- url
- version
- identifier

Supported optional parameters for `Measure` are:

- periodStart
- periodEnd

## License

Copyright 2022-2023 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
