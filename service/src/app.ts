import express from 'express';
import cors from 'cors';
import { uploadTransactionBundle } from './services/BaseService';

export const app = express();
app.use(cors({ exposedHeaders: 'Location' }));
app.use(express.json({ limit: '50mb', type: 'application/json+fhir' }));
app.use(express.json({ limit: '50mb', type: 'application/fhir+json' }));

app.post('/:base_version/', (req, res, next) => {
  return uploadTransactionBundle(req, res)
    .then(result => res.status(200).json(result))
    .catch(err => next(err));
});
