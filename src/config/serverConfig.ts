import { constants, ServerConfig } from "@projecttacoma/node-fhir-server-core";
import { MeasureService } from "../services";

export const serverConfig: ServerConfig = {
  profiles: {
    Measure: {
      service: new MeasureService(),
      versions: [constants.VERSIONS["4_0_1"]],
    },
    // Add any additional profiles for resource routes you wish to enable
  },
};
