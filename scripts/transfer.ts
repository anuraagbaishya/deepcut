/**
 * Transfer all lists from local MongoDB to Atlas.
 * Usage:
 *   ATLAS_URI="mongodb+srv://..." npx ts-node --project tsconfig.seed.json scripts/transfer.ts
 */
import mongoose from 'mongoose';
import List from '../lib/models/List';

const LOCAL_URI = process.env.LOCAL_URI || 'mongodb://localhost:27017/deepcut';
const ATLAS_URI = process.env.ATLAS_URI;

if (!ATLAS_URI) {
  console.error('Error: ATLAS_URI environment variable is required.');
  process.exit(1);
}

async function transfer() {
  // Connect to local
  console.log('Connecting to local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  const LocalList = localConn.model('List', List.schema);

  // Fetch all documents
  const lists = await LocalList.find({}).lean();
  console.log(`Found ${lists.length} list(s) locally.`);

  if (lists.length === 0) {
    console.log('Nothing to transfer.');
    await localConn.close();
    process.exit(0);
  }

  // Connect to Atlas
  console.log('Connecting to Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const AtlasList = atlasConn.model('List', List.schema);

  // Insert, skipping any that already exist by slug
  let inserted = 0;
  let skipped = 0;
  for (const list of lists) {
    const { _id, __v, ...data } = list as typeof list & { __v?: number };
    const exists = await AtlasList.findOne({ slug: data.slug });
    if (exists) {
      console.log(`  skip  ${data.slug} (already exists)`);
      skipped++;
    } else {
      await AtlasList.create(data);
      console.log(`  ✓     ${data.slug}`);
      inserted++;
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

transfer().catch((err) => {
  console.error('Transfer failed:', err);
  process.exit(1);
});
