import { loggers } from '@projecttacoma/node-fhir-server-core';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const logger = loggers.get('default');
logger.silent = true;
