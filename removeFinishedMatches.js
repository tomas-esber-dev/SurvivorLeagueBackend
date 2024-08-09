const { db } = require('./firebase');

/**
 * Function to remove matches that have finished.
 */
const removeFinishedMatches = async () => {
    try {
        // Fetch all finished matches
        const finishedMatchesSnapshot = await db.collection('matches').where('status', '==', 'FINISHED').get();

        // Loop through each finished match and delete it
        for (const matchDoc of finishedMatchesSnapshot.docs) {
            await db.collection('matches').doc(matchDoc.id).delete();
        }
    } catch (error) {
        console.error('Error removing finished matches:', error);
    }
};

module.exports = removeFinishedMatches;