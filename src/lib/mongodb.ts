import "server-only";

import { MongoClient, ServerApiVersion } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  portfolioMongoClient?: Promise<MongoClient>;
};

export function mongodbIsConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function getMongoClient() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;
  if (uri.includes("<db_username>")) {
    throw new Error("MONGODB_URI still contains the <db_username> placeholder. Replace it with your MongoDB Atlas database username.");
  }

  if (!globalForMongo.portfolioMongoClient) {
    const client = new MongoClient(uri, {
      appName: "evol-visuals-portfolio",
      maxPoolSize: 10,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 10_000,
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });
    globalForMongo.portfolioMongoClient = client.connect().catch((error) => {
      globalForMongo.portfolioMongoClient = undefined;
      throw error;
    });
  }

  return globalForMongo.portfolioMongoClient;
}

export async function getMongoDatabase() {
  const client = await getMongoClient();
  return client?.db(process.env.MONGODB_DB?.trim() || "stream") ?? null;
}
