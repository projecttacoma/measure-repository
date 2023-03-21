# Measure Repository Service Frontend

A frontend application for a prototype implementation of a [FHIR Measure Repository Service](https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html).

- Installation(#installation)

  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)

- Usage(#usage)

## Installation

### Prerequisites

- [Node.js >=11.15.0](https://nodejs.org/en/)
- [Git](https://git-scm.com/)

### Local Installation

At the root directory:

```bash
npm install
```

This repository uses [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces), so if you want to install a dependency in this directory, you have to run the following from the root directory:

```bash
npm install --workspace=frontend <package-name>
```

### Usage

To run just the frontend from the root directory:

```bash
npm run start:frontend
```

You can open the Measure Repository Service frontend application by navigating to [http://localhost:3001](http://localhost:3001) in your browser.
