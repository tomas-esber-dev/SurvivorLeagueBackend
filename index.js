const express = require('express');
// const admin = require('firebase-admin');
const { admin, db } = require('./firebase');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
// const serviceAccount = require('./serviceAccountKey.json');

const getCurrentMatchday = require('./getCurrentMatchday');
const getMatchdayResults = require('./getMatchdayResults');

// set up express app
const app = express();
const port = process.env.PORT || 8080;

// // Import the cron job logic
// const cron = require('node-cron');
// // cronJob function is imported from jobLogic.js
// const { cronJob } = require('./jobLogic');
// /**
//  * Schedule the cron job to run every day at midnight. We are checking to see if the matchday has changed.
//  * If it has, then we want to fetch the match results for the new matchday. Regardless, we want to update
//  * the user's lives according to the match results and their predictions.
//  */
// // cron.schedule('0 0 * * *', cronJob);
// // Run the cron job every minute for testing purposes
// cron.schedule('* * * * *', cronJob);

// Logic for Google Cloud Scheduler
const { cronJob } = require('./jobLogic');
// exports.scheduledCronJob = async (req, res) => {
//     try {
//         await cronJob();
//         res.status(200).send('Cron job successfully completed');
//     } catch (error) {
//         res.status(500).send('Error running cron job: ' + error.message);
//     }
// };

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

// const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

app.post('/scheduledCronJob', async (req, res) => {
    await cronJob();
    res.status(200).send('Cron job successfully completed');
});

/**
 *  An axios.post request is a method provided by the Axios library in JavaScript to make 
    HTTP POST requests. Axios is a promise-based HTTP client for the browser and Node.js that 
    makes it easy to send asynchronous HTTP requests to REST endpoints and perform CRUD operations.
 */
app.post('/makePredictions', async (req, res) => {
    const { userId, leagueId, matchday, teamId } = req.body;

    try {
        // Create a reference to the prediction document in Firestore
        const predictionRef = db.collection('predictions').doc();

        // Save the prediction to Firestore database
        await predictionRef.set({
            id: predictionRef.id,
            userId: userId,
            leagueId: leagueId,
            matchday: matchday,
            teamId: teamId,
            predictionOutcome: "DEFAULT",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).send('Prediction successfully saved');
    } catch (error) {
        res.status(500).send('Error saving prediction' + error.message);;
    }
});

/**
 * Function to save match results to Firestore database.
 * @param {*} matchResults match data to save to Firestore database.
 */
const saveMatchResults = async (matchResults) => {
    for (const match of matchResults) {
        // Create a reference to the match document in Firestore
        const matchRef = db.collection('matches').doc(match.id.toString());

        // Save match results for a given matchday to Firestore database
        await matchRef.set({
            id: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            score: match.score.fullTime,
            utcDate: match.utcDate,
            matchday: match.matchday,
            winner: match.score.winner,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
};

/**
 *  ENDPOINT: Fetch match results for a GIVEN matchday from Football Data API and save them to Firestore database.
*/
app.get('/fetchMatchdayResults/:matchday', async (req, res) => {
    const matchday = req.params.matchday;
    try {
        const matchResults = await getMatchdayResults(matchday);
        await saveMatchResults(matchResults);
        res.status(200).send('Matchday results successfully saved');
    } catch (error) {
        res.status(500).send('Error fetching matchday results: ' + error.message);
    }
});

/**
 * ENDPOINT: Fetch current matchday from Football Data API.
 */
app.get('/fetchCurrentMatchday', async (req, res) => {
    try {
        const response = await axios.get('https://api.football-data.org/v4/competitions/PL', {
            headers: {
                'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
            }
        });
        // Extract current matchday from the response
        const currentMatchday = response.data.currentSeason.currentMatchday;
        res.status(200).json({ currentMatchday: currentMatchday });
    } catch (error) {
        res.status(500).send('Error fetching current matchday: ' + error.message);
    }
});

/**
 * ENDPOINT: Fetch CURRENT matchday results from Football Data API and save them to Firestore database.
 */
app.get('/fetchCurrentMatchdayResults', async (req, res) => {
    try {
        const currentMatchday = await getCurrentMatchday();
        const matchResults = await getMatchdayResults(currentMatchday);
        await saveMatchResults(matchResults);
        res.status(200).send('Matchday results successfully saved');
    } catch (error) {
        res.status(500).send('Error fetching current matchday results: ' + error.message);
    }
});

/**
 * ENDPOINT: Fetch all teams in the BPL this year from the Football Data API. But, first, 
 * check if the teams are already in the Firestore database.
 */
app.get('/fetchTeams', async (req, res) => {
    try {
        // Fetch all teams from Firestore database
        const teamsSnapshot = await db.collection('teams').get();
        let teamsList = [];
        // Add each team to the teamsList array
        teamsSnapshot.forEach(doc => {
            teamsList.push(doc.data());
        });

        // If no teams are found in the Firestore database, fetch them from the Football Data API
        if (teamsList.length === 0) {
            const response = await axios.get('https://api.football-data.org/v4/competitions/PL/teams', {
                headers: {
                    'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
                }
            });
            // Map the response data to the teamsList array
            teamsList = response.data.teams.map(team => ({
                team: team.id, 
                name: team.name
            }));
        }
        // Save the teams to Firestore database
        const batch = db.batch();
        // For each team in the teamsList array, create a reference to the team document in Firestore
        teamsList.forEach(team => {
            const teamRef = db.collection('teams').doc(team.name.toString());
            batch.set(teamRef, team);
        });
        // Commit the batch write to Firestore database
        await batch.commit();
        res.status(200).json(teamsList);
    } catch (error) {
        res.status(500).send('Error fetching teams: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
});