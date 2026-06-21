// Run once: node drop-username-index.js
// Drops the leftover unique index on `username` from the `users` collection.
// This index is a relic of the old single-admin Mongoose User model and is
// not used by the new email/passwordHash signup system — it just blocks
// every signup after the first because all new docs implicitly have
// username: null, which collides on a UNIQUE index.

const { MongoClient } = require('mongodb');

const uri = process.argv[2] || process.env.MONGODB_URI;

if (!uri) {
  console.error('Usage: node drop-username-index.js "your-mongodb-uri"');
  console.error('Or set MONGODB_URI as an environment variable first.');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(); // uses db name from the connection string
    const col = db.collection('users');

    const indexes = await col.indexes();
    console.log('Current indexes on users collection:');
    indexes.forEach(i => console.log(' -', i.name, JSON.stringify(i.key)));

    const hasUsernameIndex = indexes.some(i => i.name === 'username_1');
    if (!hasUsernameIndex) {
      console.log('\nNo username_1 index found — nothing to do.');
      return;
    }

    await col.dropIndex('username_1');
    console.log('\n✅ Dropped username_1 index. Signups should work now.');

    // Optional: clean up any leftover docs with username:null / no email
    // (harmless orphans from the old admin system, but tidy to remove)
    const orphanCount = await col.countDocuments({ username: { $exists: true }, email: { $exists: false } });
    if (orphanCount > 0) {
      console.log(`\nNote: found ${orphanCount} old-style document(s) with a` +
        ' username field but no email field (leftover from the old admin' +
        ' system). These are harmless and unused by the new login/signup' +
        ' flow — safe to ignore or delete manually in Atlas if you want.');
    }
  } finally {
    await client.close();
  }
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
