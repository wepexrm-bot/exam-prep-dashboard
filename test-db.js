const mongoose = require('mongoose');

const uri = process.argv[2];

if (!uri) {
  console.error('Usage: node test-db.js "your-mongodb-uri"');
  process.exit(1);
}

console.log('Testing connection...');
console.log('URI (masked):', uri.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Connected successfully!');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  });
