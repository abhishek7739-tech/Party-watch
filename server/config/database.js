import mongoose from 'mongoose';
import { MONGODB_URI } from './env.js';

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}


export { connectDatabase };
