// Firebase integration removed per user request
export const firebaseService = {
    async logSOSEvent(userId, location, timestamp) {
        console.log('Firebase removed: SOS event logged to console', { userId, location, timestamp });
        return;
    },

    async getCrimeData(bbox) {
        return [];
    }
};
