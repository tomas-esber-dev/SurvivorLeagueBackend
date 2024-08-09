const axios = require('axios');

/**
 * Function to fetch match results for a given matchday from the Football Data API.
 * @param {*} matchday the desired matchday to fetch match results for.
 * @returns match results for a given matchday from the Football Data API.
 */
const getMatchdayResults = async (matchday) => {
    try {
        // Make a GET request to the Football Data API
        const response = await axios.get(`https://api.football-data.org/v4/competitions/PL/matches?matchday=${matchday}`, {
            headers: {
                'X-Auth-Token': '84672de1d2e44717af5067329c586396'
            }
        });
        return response.data.matches;
    } catch (error) {
        console.error('Error fetching matchday results:', error);
        return null;
    }
};

module.exports = getMatchdayResults;