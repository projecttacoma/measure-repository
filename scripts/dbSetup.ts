import { Connection } from '../src/db/Connection';

const DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository';
const COLLECTION_NAMES = ['Measure', 'Library', 'MeasureReport'];

async function createCollections() {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);

  const creations = COLLECTION_NAMES.map(async cn => {
    console.log(`Creating collection ${cn}`);
    await (await Connection.db.createCollection(cn)).createIndex({ id: 1 }, { unique: true });
  });

  await Promise.all(creations);
}

async function deleteCollections() {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);

  const collections = await Connection.db.listCollections().toArray();
  const deletions = collections.map(async c => {
    console.log(`Deleting collection ${c.name}`);
    await Connection.db.dropCollection(c.name);
  });
  await Promise.all(deletions);
}

if (process.argv[2] === 'delete') {
  deleteCollections()
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else if (process.argv[2] === 'create') {
  createCollections()
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else if (process.argv[2] === 'reset') {
  deleteCollections()
    .then(() => {
      return createCollections();
    })
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else {
  console.log('Usage: ts-node src/scripts/dbSetup.ts <create|delete|reset>');
}
