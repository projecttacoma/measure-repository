# Measure Repository

A prototype implementation of a [FHIR Measure Repository Service](https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html) and associated frontend application.

## Installation

### Local Installation

Clone the source code:

```bash
git clone https://github.com/projecttacoma/measure-repository-service.git
```

Install root directory dependencies:

```bash
npm install
```

### Frontend and Backend Installation

Refer to the READMEs for both the frontend and backend of the Measure Repository Service in their respective directories for specific setup and installation instructions.

## Usage

Once you have the necessary dependencies installed in the `frontend` and `backend` directories, you can run the following in the root directory:

To start the the frontend application and backend server in parallel:

```bash
npm run start:all
```

This starts up the Measure Repository service at `localhost:3000` and you can open the Measure Repository Service frontend application by navigating to http://localhost:3001 in your browser.

To start only the frontend:

```bash
npm run start:frontend
```

To start only the backend:

```bash
npm run start:backend
```

To run `lint` and `prettier` in both the frontend and backend and unit tests in the backend:

```bash
npm run check:all
```
