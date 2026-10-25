import { resolve } from 'node:path'
import { openDb } from '../src/infrastructure/database/client.ts'
import { seedIfEmpty } from '../src/infrastructure/database/seed.ts'

// No dotenv or DATABASE_URL: this command only prepares the named local test directory.
const directory = resolve(process.env.US1_TEST_DATA_DIR || '.data/us1-test')
const opened = await openDb(directory)
try {
  await seedIfEmpty(opened.db)
  console.log('US1 local test database ready: ' + directory)
} finally { await opened.close() }
