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

app.post('/makePredictions', async (req, res) => {
    const { userId, leagueId, matchweek, teamId } = req.body;

    try {
        const predictionRef = db.collection('predictions').doc();
        await predictionRef.set({
            id: predictionRef.id,
            userId: userId,
            leagueId: leagueId,
            matchweek: matchweek,
            teamId: teamId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).send('Prediction successfully saved');
        console.log("Hello from the backend!!");
    } catch (error) {
        res.status(500).send('Error saving prediction' + error.message);;
    }
});

// app.get('/fetchMatchResults', async (req, res) => {
//     try {
//         const response = await axios.get(''); // Add the API URL here
//         const matchResults = response.data;

//         for (const match of matchResults) {
//             const matchRef = db.collection('matches').doc(match.id);
//             await matchRef.set(match);

//             const predictionsSnapshot = await db.collection('predictions').where('matchId', '==', match.id).get();

//             predictionsSnapshot.forEach(async predictionDoc => {
//                 const prediction = predictionDoc.data();

//                 const userRef = db.collection('users').doc(prediction.userId);
//                 const userDoc = await userRef.get();
//                 const user = userDoc.data();

//                 if (prediction.teamId === match.winner) {
//                     await userRef.update({
//                         lives: user.lives + 0 // can change depending on the points system
//                     });
//                 } else {
//                     await userRef.update({
//                         lives: user.lives - 1
//                     });
//                 }

//                 await userRef.update(user);
//             });
//         }

//         res.status(200).send('Match results successfully saved');
//     } catch (error) {
//         res.status(500).send('Error saving match results' + error.message);
//     }
// });

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
});