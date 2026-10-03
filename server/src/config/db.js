const dns = require('dns');
const mongoose = require('mongoose');

if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

let connection = null;

const connectDB = async () => {
  if (connection) return connection;
  if (mongoose.connection.readyState === 1) {
    connection = mongoose.connection;
    return connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }

  const conn = await mongoose.connect(uri);
  connection = conn;
  console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = connectDB;
