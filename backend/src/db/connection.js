const mongoose = require("mongoose");

let connected = false;

async function connectDB() {
  if (connected) return mongoose.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and set it to your MongoDB Atlas connection string.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  connected = true;
  console.log("Connected to MongoDB:", mongoose.connection.name);
  return mongoose.connection;
}

async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

module.exports = { connectDB, disconnectDB, mongoose };
