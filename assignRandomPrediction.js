const { db, admin } = require('./firebase');

/**
 * Function to assign a random prediction to a user for a given matchday.
 * @param {*} userId id of the user to assign the prediction to.
 * @param {*} leagueId id of the league to assign the prediction to.
 * @param {*} matchday the matchday to assign the prediction to.
 * @returns the prediction assigned to the user.
 */
const assignRandomPrediction = async (userId, leagueId, matchday) => {

    // Fetch all matches for the given matchday
    const matchesSnapshot = await db.collection('matches')
        .where('matchday', '==', matchday)
        .get();

    const allTeams = new Set();

    // Loop through each match and add the home and away teams to a set
    matchesSnapshot.forEach(match => {
        allTeams.add(match.data().homeTeam);
        allTeams.add(match.data().awayTeam);
    });

    let queryForPredictions;

    // If the current matchday is less than 21, get predictions for the first 20 matchdays
    if (matchday < 21) {
        queryForPredictions = db.collection('predictions')
            .where('userId', '==', userId)
            .where('leagueId', '==', leagueId)
            .where('matchday', '<', 21);
    } else {
        // If the current matchday is 21 or greater, get predictions for matchdays 21 and above
        queryForPredictions = db.collection('predictions')
            .where('userId', '==', userId)
            .where('leagueId', '==', leagueId)
            .where('matchday', '>=', 21);
    }

    const predictionsSnapshot = await queryForPredictions.get();

    const predictedTeams = new Set();
    // Loop through each prediction and add the team to a set
    predictionsSnapshot.docs.forEach(prediction => {
        predictedTeams.add(prediction.data().teamId);
    });

    // Find the teams that have not been predicted
    const availableTeams = [...allTeams].filter(team => !predictedTeams.has(team));

    // If there are no available teams to predict, return
    if (availableTeams.length === 0) {
        console.log('No available predictions to assign');
        return;
    }

    // Assign a the first available team sorted in ascending order alphabetically
    const randomTeam = availableTeams.sort()[0];

    // Create a prediction object
    const prediction = {
        userId: userId,
        leagueId: leagueId,
        matchday: matchday,
        teamId: randomTeam,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save the prediction to Firestore database
    const predictionDoc = await db.collection('predictions').add(prediction);
    return prediction;
};

module.exports = assignRandomPrediction;