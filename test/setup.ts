import { loggers } from '@projecttacoma/node-fhir-server-core';

const logger = loggers.get('default');
logger.silent = true;
