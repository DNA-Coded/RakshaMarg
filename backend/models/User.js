import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },
        email: {
            type: String,
            default: null,
            trim: true,
            lowercase: true
        },
        displayName: {
            type: String,
            default: null,
            trim: true
        },
        photoURL: {
            type: String,
            default: null
        },
        phoneNumber: {
            type: String,
            default: null,
            trim: true
        },
        deviceId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        role: {
            type: String,
            default: 'user',
            enum: ['user', 'admin']
        },
        trustedContacts: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: 100
                    },
                    phone: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: 30
                    }
                }
            ],
            default: []
        },
        lastLoginAt: {
            type: Date,
            default: Date.now
        },
        lastSosEvent: {
            type: {
                source: {
                    type: String,
                    default: 'unknown',
                    trim: true
                },
                deviceId: {
                    type: String,
                    default: null,
                    trim: true
                },
                triggeredAt: {
                    type: Date,
                    default: null
                },
                acknowledgedAt: {
                    type: Date,
                    default: null
                }
            },
            default: null
        },
        lastKnownLocation: {
            type: {
                lat: {
                    type: Number,
                    default: null
                },
                lng: {
                    type: Number,
                    default: null
                },
                accuracyMeters: {
                    type: Number,
                    default: null
                },
                source: {
                    type: String,
                    default: 'unknown',
                    trim: true
                },
                updatedAt: {
                    type: Date,
                    default: null
                }
            },
            default: null
        }
    },
    {
        timestamps: true
    }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
