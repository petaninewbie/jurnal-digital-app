// Database Configuration for MongoDB
// File: config/database.js
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
let client;
let db;
// MongoDB connection configuration
const mongoConfig = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    maxPoolSize: 10, // Maximum number of connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close connections after 45 seconds of inactivity
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false, // Disable mongoose buffering
};
// Connect to MongoDB
async function connectToDatabase() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        console.log('🔄 Connecting to MongoDB...');
        client = new MongoClient(process.env.MONGODB_URI, mongoConfig);
        await client.connect();
        // Test the connection
        await client.db('admin').command({ ping: 1 });
        db = client.db(process.env.MONGODB_DB_NAME || 'jurnal_digital_smkn4');
        console.log('✅ Successfully connected to MongoDB!');
        console.log(`📊 Database: ${db.databaseName}`);
        // Create indexes for better performance
        await createIndexes();
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}
// Get database instance
async function getDatabase() {
    if (!db) {
        await connectToDatabase();
    }
    return db;
}
// Create database indexes for better performance
async function createIndexes() {
    try {
        console.log('🔧 Creating database indexes...');
        // Users collection indexes
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ role: 1 });
        // Siswa collection indexes
        await db.collection('siswa').createIndex({ nis: 1 }, { unique: true });
        await db.collection('siswa').createIndex({ kelas: 1 });
        await db.collection('siswa').createIndex({ jurusan: 1 });
        await db.collection('siswa').createIndex({ nama_lengkap: 'text' });
        // Jurnal Harian collection indexes
        await db.collection('jurnal_harian').createIndex({ siswa_id: 1 });
        await db.collection('jurnal_harian').createIndex({ tanggal: 1 });
        await db.collection('jurnal_harian').createIndex({ kebiasaan: 1 });
        await db.collection('jurnal_harian').createIndex({ 
            siswa_id: 1, 
            tanggal: 1, 
            kebiasaan: 1 
        }, { unique: true });
        // Guru collection indexes
        await db.collection('guru').createIndex({ nip: 1 }, { unique: true });
        await db.collection('guru').createIndex({ email: 1 });
        console.log('✅ Database indexes created successfully!');
    } catch (error) {
        console.error('❌ Error creating indexes:', error.message);
    }
}
// Close database connection
async function closeDatabaseConnection() {
    try {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error.message);
    }
}
// Handle application termination
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Gracefully shutting down...');
    await closeDatabaseConnection();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM. Gracefully shutting down...');
    await closeDatabaseConnection();
    process.exit(0);
});
// Export functions
module.exports = {
    connectToDatabase,
    getDatabase,
    closeDatabaseConnection,
    createIndexes
};