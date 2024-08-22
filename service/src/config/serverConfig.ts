import { constants, ServerConfig, resolveSchema } from '@projecttacoma/node-fhir-server-core';
import { MeasureService, LibraryService } from '../services';
import capabilityStatementResources from './capabilityStatementResources.json';

const customCapabilityStatement = (): fhir4.CapabilityStatement => {
  const base_version = constants.VERSIONS['4_0_1'];
  const CapabilityStatement = resolveSchema(base_version, 'CapabilityStatement');

  return new CapabilityStatement({
    id: 'MeasureRepositoryServiceCapabilityStatement',
    name: 'MeasureRepositoryService',
    title: 'FHIR Measure Repository Service Capability Statement',
    status: 'active',
    // date last modified
    date: new Date(2023, 0, 31),
    publisher: 'The MITRE Corporation',
    instantiates: [
      'http://hl7.org/fhir/us/cqfmeasures/CapabilityStatement/shareable-measure-repository',
      'http://hl7.org/fhir/us/cqfmeasures/CapabilityStatement/publishable-measure-repository',
      'http://hl7.org/fhir/us/cqfmeasures/CapabilityStatement/authoring-measure-repository'
    ],
    kind: 'instance',
    implementation: {
      description: 'A prototype implementation of a FHIR Measure Repository Service'
    },
    fhirVersion: base_version.replace(/_/g, '.'),
    format: ['application/fhir+json'],
    // NOTE: the definitions for authoring measure repository operations
    // are not FHIR OperationDefinitions, and we should update the JSON
    // when FHIR OperationDefinitions are available
    rest: [capabilityStatementResources]
  });
};

export const serverConfig: ServerConfig = {
  profiles: {
    Measure: {
      service: new MeasureService(),
      versions: [constants.VERSIONS['4_0_1']],
      operation: [
        {
          name: 'package',
          route: '/$cqfm.package',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/$cqfm.package',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/:id/$cqfm.package',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/:id/$cqfm.package',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'dataRequirements',
          route: '/$data-requirements',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Measure-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/$data-requirements',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Measure-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/:id/$data-requirements',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Measure-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/:id/$data-requirements',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Measure-data-requirements'
        },
        {
          name: 'draft',
          route: '/$draft',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/$draft',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/:id/$draft',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/:id/$draft',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'clone',
          route: '/$clone',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/$clone',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/:id/$clone',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/:id/$clone',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'approve',
          route: '/$approve',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/$approve',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/:id/$approve',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/:id/$approve',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'review',
          route: '/$review',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/$review',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/:id/$review',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/:id/$review',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        }
      ]
    },
    Library: {
      service: new LibraryService(),
      versions: [constants.VERSIONS['4_0_1']],
      operation: [
        {
          name: 'package',
          route: '/$cqfm.package',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/$cqfm.package',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/:id/$cqfm.package',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'package',
          route: '/:id/$cqfm.package',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/cqfm-package'
        },
        {
          name: 'dataRequirements',
          route: '/$data-requirements',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Library-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/$data-requirements',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Library-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/:id/$data-requirements',
          method: 'GET',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Library-data-requirements'
        },
        {
          name: 'dataRequirements',
          route: '/:id/$data-requirements',
          method: 'POST',
          reference: 'http://hl7.org/fhir/us/cqfmeasures/OperationDefinition/Library-data-requirements'
        },
        {
          name: 'draft',
          route: '/$draft',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/$draft',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/:id/$draft',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'draft',
          route: '/:id/$draft',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-draft.html'
        },
        {
          name: 'clone',
          route: '/$clone',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/$clone',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/:id/$clone',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'clone',
          route: '/:id/$clone',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-clone.html'
        },
        {
          name: 'approve',
          route: '/$approve',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/$approve',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/:id/$approve',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'approve',
          route: '/:id/$approve',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-approve.html'
        },
        {
          name: 'review',
          route: '/$review',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/$review',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/:id/$review',
          method: 'GET',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        },
        {
          name: 'review',
          route: '/:id/$review',
          method: 'POST',
          reference: 'https://hl7.org/fhir/uv/crmi/STU1/OperationDefinition-crmi-review.html'
        }
      ]
    }
  },
  statementGenerator() {
    return { makeStatement: customCapabilityStatement, securityStatement: () => null };
  }
};
