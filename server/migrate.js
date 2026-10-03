/**
 * Copies every application database from the local MongoDB server to Atlas.
 * System databases (admin, local, config) are left behind.
 *
 *   SOURCE_URI  local server, default mongodb://127.0.0.1:27017
 *   MONGODB_URI Atlas connection string, including the database name is optional
 */
require('dotenv').config();
const dns = require('dns');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const sourceUri = process.env.SOURCE_URI || 'mongodb://127.0.0.1:27017';
const targetUri = process.env.MONGODB_URI;

const SYSTEM = new Set(['admin', 'local', 'config']);

async function copyDatabase(source, target, name) {
  const from = source.db(name);
  const to = target.db(name);
  const collections = await from.listCollections().toArray();
  let documents = 0;

  for (const collection of collections) {
    if (collection.name.startsWith('system.')) continue;
    const rows = await from.collection(collection.name).find({}).toArray();
    await to.collection(collection.name).deleteMany({});
    if (rows.length) {
      await to.collection(collection.name).insertMany(rows, { ordered: false });
    }
    documents += rows.length;
    console.log(`  ${name}.${collection.name}: ${rows.length}`);
  }

  return documents;
}

async function migrate() {
  if (!targetUri || targetUri.includes('127.0.0.1')) {
    console.error('MONGODB_URI must be the Atlas connection string before running migrate.');
    process.exit(1);
  }

  const source = new MongoClient(sourceUri);
  const target = new MongoClient(targetUri);

  await source.connect();
  await target.connect();

  const listed = await source.db().admin().listDatabases();
  const names = listed.databases.map((db) => db.name).filter((name) => !SYSTEM.has(name));
  console.log(`Copying ${names.length} database(s): ${names.join(', ') || '(none)'}`);

  let total = 0;
  for (const name of names) {
    total += await copyDatabase(source, target, name);
  }

  await source.close();
  await target.close();
  console.log(`Done. ${total} documents are now on Atlas.`);
}

migrate().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
