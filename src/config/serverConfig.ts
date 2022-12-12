import { constants, ServerConfig } from '@projecttacoma/node-fhir-server-core';
import { MeasureService, LibraryService } from '../services';

export const serverConfig: ServerConfig = {
  profiles: {
    Measure: {
      service: new MeasureService(),
      versions: [constants.VERSIONS['4_0_1']],
      operation: [
        {
          name: 'package',
          route: '/$package',
          method: 'GET',
          reference: 'https://build.fhir.org/ig/HL7/cqf-measures/OperationDefinition-Measure-package.html'
        },
        {
          name: 'package',
          route: '/$package',
          method: 'POST',
          reference: 'https://build.fhir.org/ig/HL7/cqf-measures/OperationDefinition-Measure-package.html'
        },
        {
          name: 'package',
          route: '/:id/$package',
          method: 'GET',
          reference: 'https://build.fhir.org/ig/HL7/cqf-measures/OperationDefinition-Measure-package.html'
        },
        {
          name: 'package',
          route: '/:id/$package',
          method: 'POST',
          reference: 'https://build.fhir.org/ig/HL7/cqf-measures/OperationDefinition-Measure-package.html'
        }
      ]
    },
    Library: {
      service: new LibraryService(),
      versions: [constants.VERSIONS['4_0_1']]
    }
  }
};
