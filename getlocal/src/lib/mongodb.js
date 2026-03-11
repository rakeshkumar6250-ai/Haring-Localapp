import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'getlocal';

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getCandidates() {
  const db = await getDb();
  return db.collection('candidates');
}

export async function getJobs() {
  const db = await getDb();
  return db.collection('jobs');
}

export async function getWallets() {
  const db = await getDb();
  return db.collection('wallets');
}

// NEW: Support Tickets collection
export async function getSupportTickets() {
  const db = await getDb();
  return db.collection('support_tickets');
}

// Employers collection (KYC & profiles)
export async function getEmployers() {
  const db = await getDb();
  return db.collection('employers');
}

export default clientPromise;