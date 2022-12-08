import { constants, ServerConfig } from '@projecttacoma/node-fhir-server-core';
import { MeasureService } from '../services';
import { LibraryService } from '../services/LibraryService';

export const serverConfig: ServerConfig = {
  profiles: {
    Measure: {
      service: new MeasureService(),
      versions: [constants.VERSIONS['4_0_1']]
    },
    Library: {
      service: new LibraryService(),
      versions: [constants.VERSIONS['4_0_1']]
    }
  }
};
