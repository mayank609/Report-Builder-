import { MongoClient } from "mongodb";
import { ensureIndexes } from "./db-indexes";

const options = {};
let cachedPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (cachedPromise) return cachedPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error(
        'Missing environment variable "MONGODB_URI". ' +
        "Set it in .env.local or your Vercel project settings."
      )
    );
  }

  if (process.env.NODE_ENV === "development") {
    const g = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    cachedPromise = g._mongoClientPromise;
  } else {
    cachedPromise = new MongoClient(uri, options).connect();
  }

  if (!indexesRequested) {
    indexesRequested = true;
    cachedPromise
      .then((client) => ensureIndexes(client.db(DB_NAME)))
      .catch((error) => console.warn("ensureIndexes skipped:", error));
  }

  return cachedPromise;
}

let indexesRequested = false;

export default getClientPromise;

export const DB_NAME = process.env.MONGODB_DB_NAME || "report-builder";
