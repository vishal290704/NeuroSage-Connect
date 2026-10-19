import mongoose from "mongoose";
import { getServerConfig } from "@/lib/config";

const globalForMongoose = globalThis;

export async function connectToDatabase() {
  const { mongodbUri, databaseName } = getServerConfig();
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!globalForMongoose.mongoosePromise) {
    globalForMongoose.mongoosePromise = mongoose.connect(mongodbUri, { dbName: databaseName, bufferCommands: false })
      .catch((error) => {
        globalForMongoose.mongoosePromise = undefined;
        throw new Error(`Unable to connect to the configured database: ${error.name || "connection error"}`);
      });
  }
  await globalForMongoose.mongoosePromise;
  return mongoose.connection;
}