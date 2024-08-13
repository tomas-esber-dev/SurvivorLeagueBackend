const { db, admin } = require('./firebase');
const assignRandomPrediction = require('./assignRandomPrediction');

/**
 * Function to handle updating a user's lives based on their predictions.
 * @param {*} matchday the current matchday.
 */
const updateUserLives = async (matchday) => {
    try {
        const leaguesSnapshot = await db.collection('leagues').get();
        console.log('Updating user lives...');
        // Loop through each league
        console.log('Length of leaguesSnapshot:', leaguesSnapshot.docs.length);
        for (const leagueDoc of leaguesSnapshot.docs) {
            const leagueId = leagueDoc.id;
            const usersRef = leagueDoc.data().users;
            console.log(`Updating lives for users in league ${leagueId}`);
            // Loop through each user in the league
            for (const userRef of usersRef) {
                console.log('Length of usersRef:', usersRef.length);
                const userDoc = await userRef.get();
                const userId = userDoc.id;

                // Check if the user document exists in Firestore
                const userLeagueRef = db.collection('users').doc(userId).collection('leagues').doc(leagueId);
                let userLeagueSnapshot = await userLeagueRef.get();

                // If the user document does not exist, create it with default 3 lives
                if (!userLeagueSnapshot.exists) {
                    // assuming users can only join league with 3 lives and before the 1st matchday
                    await userLeagueRef.set({ lives: 3, lastMatchdayUpdated: 0 });
                    userLeagueSnapshot = await userLeagueRef.get();
                }

                // Fetch the user's prediction for the current matchday
                const predictionsSnapshot = await db.collection('predictions')
                    .where('userId', '==', userId)
                    .where('leagueId', '==', leagueId)
                    .where('matchday', '==', matchday)
                    .get();
                
                let predictionData;
                let predictionDocRef;
                // If the user has not made a prediction for the current matchday, assign a random prediction
                if (predictionsSnapshot.empty) {
                    // only assign if the deadline to make a prediction has passed
                    // get an assigned prediction
                    const { assignedPredictionData, assignedPredictionDocRef } = await assignRandomPrediction(userId, leagueId, matchday);
                    // if assigned prediction is not available, skip to the next user but flag an error
                    if (assignedPredictionData && assignedPredictionDocRef) {
                        predictionData = assignedPredictionData;
                        predictionDocRef = assignedPredictionDocRef;
                    } else if (!assignedPredictionData || !assignedPredictionDocRef) {
                        console.log('Error with assigning predictions');
                        continue;
                    }
                } else {
                    predictionData = predictionsSnapshot.docs[0].data();
                    predictionDocRef = predictionsSnapshot.docs[0].ref;
                }

                // get the prediction oucome of the prediction
                let predictionOutcome = predictionData.predictionOutcome;

                const predictedTeam = predictionData.teamId;

                // Fetch the match results for the current matchday
                const matchesSnapshot = await db.collection('matches')
                    .where('matchday', '==', matchday)
                    .get();

                // Loop through each match result for the current matchday
                for (const matchDoc of matchesSnapshot.docs) {
                    console.log('Length of matchesSnapshot:', matchesSnapshot.docs.length);
                    const matchData = matchDoc.data();
                    console.log(`Checking match between ${matchData.homeTeam} and ${matchData.awayTeam}`);
                    console.log(userLeagueSnapshot.data().lastMatchdayUpdated, matchday);
                    console.log(matchData.status, matchData.status === 'FINISHED');
                    // Check if the match has been played and if the user has not already been updated for this matchday
                    if (matchData.status === 'FINISHED' && userLeagueSnapshot.data().lastMatchdayUpdated < matchday) {
                        console.log(`Match between ${matchData.homeTeam} and ${matchData.awayTeam} has been played`);
                        console.log('Predicted team:', predictedTeam);
                        // Check if the user's prediction is correct (either selected a winning team or a draw)
                        if ((matchData.homeTeam === predictedTeam && matchData.winner === 'HOME_TEAM') ||
                            (matchData.awayTeam === predictedTeam && matchData.winner === 'AWAY_TEAM') ||
                            (matchData.homeTeam === predictedTeam && matchData.winner === 'DRAW') ||
                            (matchData.awayTeam === predictedTeam && matchData.winner === 'DRAW')) {
                            predictionOutcome = "CORRECT";
                            console.log(`User ${userId} correctly predicted the match between ${matchData.homeTeam} and ${matchData.awayTeam}`);
                            await userLeagueRef.update({ lastMatchdayUpdated: matchday });
                            break;
                        } else if (matchData.homeTeam === predictedTeam || matchData.awayTeam === predictedTeam) { // If the user's prediction is incorrect
                            predictionOutcome = "INCORRECT";
                            console.log(`User ${userId} incorrectly predicted the match between ${matchData.homeTeam} and ${matchData.awayTeam}`);
                            await userLeagueRef.update({ lives: admin.firestore.FieldValue.increment(-1), lastMatchdayUpdated: matchday });
                            console.log(`User ${userId} lost a life`);
                            break;
                        }
                    }
                }
                await predictionDocRef.update({ predictionOutcome });
            }
        }
    } catch (error) {
        console.error('Error updating user lives:', error);
    }
};

module.exports = updateUserLives;