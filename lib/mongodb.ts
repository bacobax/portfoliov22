import { MongoClient, Db } from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) {
    return db
  }

  const uri = process.env.MONGODB_ATLAS_URI

  if (!uri) {
    throw new Error("MONGODB_ATLAS_URI is not set in the environment variables")
  }

  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }

  db = client.db()
  return db
}
