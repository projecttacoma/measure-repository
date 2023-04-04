import { initialize, loggers } from '@projecttacoma/node-fhir-server-core';
import * as dotenv from 'dotenv';
import { serverConfig } from './config/serverConfig';
import { Connection } from './db/Connection';
import express from 'express';
import { uploadTransactionBundle } from './services/BaseService';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb', type: 'application/json+fhir' }));
app.use(express.json({ limit: '50mb', type: 'application/fhir+json' }));

app.post('/:base_version/', (req, res, next) => {
  return uploadTransactionBundle(req, res)
    .then(result => res.status(200).json(result))
    .catch(err => next(err));
});

const server = initialize(serverConfig, app);
const logger = loggers.get('default');

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const host = process.env.HOST || 'localhost';
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository';

Connection.connect(dbUrl)
  .then(() => {
    logger.info(`Connected to ${dbUrl}`);
    server.listen(port, host, () => {
      logger.info(`Server listening on ${host}:${port}`);
    });
  })
  .catch(e => {
    logger.error(e.message);
    process.exit(1);
  });
