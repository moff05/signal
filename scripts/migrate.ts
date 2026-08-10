import { getDb } from '../lib/db';
import { runMigrations } from '../lib/migrate';

runMigrations(getDb())
  .then(() => console.log('Migration complete.'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
