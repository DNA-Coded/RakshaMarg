import mongoose from 'mongoose';
import { config } from '../config/env.js';

export async function connectMongoDB() {
    if (!config.mongodbUri) {
        throw new Error('Missing MONGODB_URI in environment');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    await mongoose.connect(config.mongodbUri, {
        dbName: config.mongodbDbName,
        serverSelectionTimeoutMS: config.mongodbConnectTimeoutMs
    });

    return mongoose.connection;
}

export function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

export async function disconnectMongoDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
}
