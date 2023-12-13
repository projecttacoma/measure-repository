# Measure Repository Service Frontend

A frontend application for a prototype implementation of a [FHIR Measure Repository Service](https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html).

- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
- [Usage](#usage)
- [Features](#features)

## Installation

### Prerequisites

- [Node.js >=18.0.0](https://nodejs.org/en/)
- [Git](https://git-scm.com/)

### Local Installation

At the root directory:

```bash
npm install
```

This repository uses [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces), so if you want to install a dependency in this directory, you have to run the following from the root directory:

```bash
npm install --workspace=app <package-name>
```

## Usage

To run just the frontend from the root directory:

```bash
npm run start:app
```

You can open the Measure Repository Service frontend application by navigating to [http://localhost:3001](http://localhost:3001) in your browser.


# Frontend Features

## Navigation

The application is divided into two main sets of functionality, _Repository_ and _Authoring_, both of which are accessible from tabs at the top of the page.

![Screenshot of tabs](./static/tabs.png)

The _Repository_ tab provides functionality for access and interacting with measure artifacts that are in the FHIR Measure Repository Service. The Authoring tab focuses on measure artifacts that are in the process of being drafted. Artifacts can be copied or moved between these two spaces through _draft_ and _release_ actions, described below.

Within these tabs, the left panel navigation allows for selecting artifact types or searching (Repository only) for artifacts so that they can be browsed for viewing or actions.

![Screenshot of navigation](./static/navigation.png)

## Landing Page
The landing page can be accessed on first load or by clicking the Measure Repository home button on the top left. This page links to resources to learn more about the Measure Repository and shows existing FHIR service capabilities.

## Repository Tab
The Repository tab displays sets of artifacts from the FHIR Measure Repository Service. Options allow for viewing resource details or reviewing the resource.

![Screenshot of repository options](./static/repository-options.png)

### Viewing
-	Measure: Resource details include options to see the JSON, Data Requirements, or Dependencies.        
-	Library: Resource details include options to see the JSON or Narrative.  
-	Drafting: Both resource views allow the user to create a draft from the artifact. This action copies the existing artifact and any children it owns to the draft Authoring space with an incremented version to logically differentiate it from the original artifact.

### Reviewing
Reviewing a resource provides options for viewing existing comments on the resource or adding a new comment. (Note: this is currently partially implemented and requires updates for viewing comments.)

## Authoring Tab
The Authoring tab gives options for creating a new draft artifact from scratch or starting from a copy of an existing artifact from the FHIR Measure Repository. 

![Screenshot of create draft artifact](./static/draft-artifact.png)

The left navigation resource type selection displays sets of artifacts that are in progress, being drafted for potential addition to the FHIR Measure Repository. Options allow for editing, reviewing, or deleting a draft resource.

![Screenshot of authoring options](./static/authoring-options.png)

### Editing
-	Editing a Measure or Library allows updates to basic resource fields:
  - url
  - identifier value
  - identifier system
  - name
  - title
  - description
  - library (Measure only)
- Releasing: Both resource types may be released from the editing page. This action publishes the draft artifact and any children it owns to the Repository space, adding them to the FHIR Measure Repository and giving them an active status. The draft artifact(s) will be removed from the Authoring space.      

### Reviewing
Reviewing a resource provides options for viewing existing comments on the resource or adding a new comment.

### Deleting
Deleting an artifact will permanently remove it from the draft database.
