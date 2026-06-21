import mongoose from 'mongoose';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

// ── Mongoose connection (used by AppData and all existing routes) ─────────────

declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ── Raw MongoDB client (used by new users auth routes) ────────────────────────

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export { clientPromise };

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  examType: string;
  examYear: number;
  verified: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  verifyAttempts?: number;
  createdAt: Date;
}

export async function getUsersCollection() {
  const conn = await clientPromise;
  const db = conn.db(); // uses db name from connection string (gate-prep)
  return db.collection<UserDoc>('users');
}

export function toObjectId(id: string) {
  return new ObjectId(id);
}