const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
const port = 3000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

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
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).send('Prediction successfully saved');
    } catch (error) {
        res.status(500).send('Error saving prediction' + error.message);;
    }
});

/**
 * Function to fetch the current matchday from the Football Data API.
 * @returns the current matchday from the Football Data API.
 */
const getCurrentMatchday = async () => {
    const response = await axios.get('https://api.football-data.org/v4/competitions/PL', {
        headers: {
            'X-Auth-Token': '84672de1d2e44717af5067329c586396'
        }
    });
    return response.data.currentSeason.currentMatchday;   
};

/**
 * Function to fetch match results for a given matchday from the Football Data API.
 * @param {*} matchday the desired matchday to fetch match results for.
 * @returns match results for a given matchday from the Football Data API.
 */
const getMatchdayResults = async (matchday) => {
    // Make a GET request to the Football Data API
    const response = await axios.get(`https://api.football-data.org/v4/competitions/PL/matches?matchday=${matchday}`, {
        headers: {
            'X-Auth-Token': '84672de1d2e44717af5067329c586396'
        }
    });
    return response.data.matches;
};

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
                'X-Auth-Token': '84672de1d2e44717af5067329c586396'
            }
        });
        // Extract current matchday from the response
        const currentMatchday = response.data.currentSeason.currentMatchday;
        res.status(200).send(`Current matchday: ${currentMatchday}`);
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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
});