import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

db.execute("PRAGMA table_info(products)")
  .then(res => console.log(res.rows))
  .catch(e => console.error(e.message));
