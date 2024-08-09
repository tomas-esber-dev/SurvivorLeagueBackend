const admin = require('firebase-admin');
const getCurrentMatchday = require('./getCurrentMatchday');
const getMatchdayResults = require('./getMatchdayResults');
const updateUserLives = require('./updateUserLives');
const removeFinishedMatches = require('./removeFinishedMatches');
const db = admin.firestore();

/**
 * Function to fetch and save matchday results to Firestore and update user lives.
 */
const fetchAndSaveMatchdayResults = async () => {
    console.log('Fetching and saving matchday results...');
    const currentMatchday = await getCurrentMatchday();
    const matchdayResults = await getMatchdayResults(currentMatchday);
    // Save matchday results to Firestore
    for (const match of matchdayResults) {
        const matchRef = db.collection('matches').doc(match.id.toString());
        await matchRef.set({
            id: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            score: match.score.fullTime,
            utcDate: match.utcDate,
            matchday: match.matchday,
            winner: match.score.winner,
            status: match.status,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // Update user lives based on the matchday results and their prediction
    await updateUserLives(currentMatchday);
    console.log('Matchday results saved and user lives updated');
};

/**
 * Function to run the daily cron job.
 */
const cronJob = async () => {
    console.log('Running daily job to fetch and save matchday results...');

    // Fetch the previous matchday from Firestore
    const previousMatchdayDoc = await db.collection('metadata').doc('previousMatchday').get();
    // If the document doesn't exist, set the previous matchday to 1 (the first matchday)
    const previousMatchday = previousMatchdayDoc.exists ? previousMatchdayDoc.data().value : 1;
    console.log('Previous matchday:', previousMatchday);
    // Fetch and save matchday results
    await fetchAndSaveMatchdayResults();
    const currentMatchday = await getCurrentMatchday();
    console.log('Current matchday:', currentMatchday);
    // Remove finished matches from Firestore
    console.log('Removing finished matches from Firestore...');
    await removeFinishedMatches();

    // If the current matchday is different from the previous matchday, update the previous matchday in Firestore
    if (currentMatchday !== previousMatchday) {
        console.log('Matchday has changed. Updating previous matchday...');
        await db.collection('metadata').doc('currentMatchday').set({ value: currentMatchday });
    }
}

module.exports = { fetchAndSaveMatchdayResults, cronJob };