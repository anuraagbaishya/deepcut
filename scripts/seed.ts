import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import List from '../lib/models/List';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/listgame';

// paste your seed data here or import from a JSON file
const spotifyTop100 = {
  slug: 'spotify-top-100',
  title: 'Top 100 Most Streamed Spotify Songs of All Time',
  category: 'Music',
  description: 'The 100 most-streamed songs in Spotify history.',
  items: [
    { rank: 1, value: 'Blinding Lights', hint: 'The Weeknd' },
    { rank: 2, value: 'Shape of You', hint: 'Ed Sheeran' },
    // ... add more items
  ],
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    await List.deleteMany({});
    await List.insertMany([spotifyTop100]);
    console.log('Seeded successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
