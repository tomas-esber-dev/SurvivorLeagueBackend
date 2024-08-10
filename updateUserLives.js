const { db, admin } = require('./firebase');
const assignRandomPrediction = require('./assignRandomPrediction');

/**
 * Function to handle updating a user's lives based on their predictions.
 * @param {*} matchday the current matchday.
 */
const updateUserLives = async (matchday) => {
    const leaguesSnapshot = await db.collection('leagues').get();
    console.log('Updating user lives...');
    // Loop through each league
    for (const leagueDoc of leaguesSnapshot.docs) {
        const leagueId = leagueDoc.id;
        const usersRef = leagueDoc.data().users;
        console.log(`Updating lives for users in league ${leagueId}`);
        // Loop through each user in the league
        for (const userRef of usersRef) {
            const userDoc = await userRef.get();
            const userId = userDoc.id;

            // Check if the user document exists in Firestore
            const userLeagueRef = db.collection('users').doc(userId).collection('leagues').doc(leagueId);
            const userLeagueSnapshot = await userLeagueRef.get();

            // If the user document does not exist, create it with default 3 lives
            if (!userLeagueSnapshot.exists) {
                // assuming users can only join league with 3 lives and before the 1st matchday
                await userLeagueRef.set({ lives: 3, lastMatchdayUpdated: 0 });
            }

            // Fetch the user's prediction for the current matchday
            const predictionsSnapshot = await db.collection('predictions')
                .where('userId', '==', userId)
                .where('leagueId', '==', leagueId)
                .where('matchday', '==', matchday)
                .get();
            
            let predictionData;

            // If the user has not made a prediction for the current matchday, assign a random prediction
            if (predictionsSnapshot.empty) {
                // only assign if the deadline to make a prediction has passed
                predictionData = await assignRandomPrediction(userId, leagueId, matchday);
            } else {
                predictionData = predictionsSnapshot.docs[0].data();
            }

            const predictedTeam = predictionData.teamId;

            // Fetch the match results for the current matchday
            const matchesSnapshot = await db.collection('matches')
                .where('matchday', '==', matchday)
                .get();

            // Loop through each match result for the current matchday
            for (const matchDoc of matchesSnapshot.docs) {
                const matchData = matchDoc.data();
                // Check if the match has been played and if the user has not already been updated for this matchday
                if (matchData.status === 'FINISHED' && userLeagueSnapshot.data().lastMatchdayUpdated < matchday) {
                    // Check if the user's prediction is correct (either selected a winning team or a draw)
                    if ((matchData.homeTeam === predictedTeam && matchData.winner === 'HOME_TEAM') ||
                        (matchData.awayTeam === predictedTeam && matchData.winner === 'AWAY_TEAM') ||
                        (matchData.homeTeam === predictedTeam && matchData.winner === 'DRAW') ||
                        (matchData.awayTeam === predictedTeam && matchData.winner === 'DRAW')) {
                        console.log(`User ${userId} correctly predicted the match between ${matchData.homeTeam} and ${matchData.awayTeam}`);
                        await userLeagueRef.update({ lastMatchdayUpdated: matchday });
                        break;
                    } else if (matchData.homeTeam === predictedTeam || matchData.awayTeam === predictedTeam) { // If the user's prediction is incorrect
                        console.log(`User ${userId} incorrectly predicted the match between ${matchData.homeTeam} and ${matchData.awayTeam}`);
                        await userLeagueRef.update({ lives: admin.firestore.FieldValue.increment(-1), lastMatchdayUpdated: matchday });
                        console.log(`User ${userId} lost a life`);
                        break;
                    }
                }
            }
        }
    }
};

module.exports = updateUserLives;