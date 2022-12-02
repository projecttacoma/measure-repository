# Measure Repository Service

A prototype implementation of a [FHIR Measure Repository Service](https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html)

## Prerequisites

- [Node.js >=16.0.0](https://nodejs.org/en/)
- [MongoDB >= 6.0](https://www.mongodb.com)

## Usage

```
npm start
```

### First time Database Setup

This server comes with a script to create collections for FHIR Measure, Library, and MeasureReport resources which will be used by the measure repository service.
To create these collections:

```
npm run db:setup
```

## License

Copyright 2022 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
