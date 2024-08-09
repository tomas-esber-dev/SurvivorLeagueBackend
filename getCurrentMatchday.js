const axios = require('axios');

/**
 * Function to fetch the current matchday from the Football Data API.
 * @returns the current matchday from the Football Data API.
 */
const getCurrentMatchday = async () => {
    try {
        console.log('Fetching current matchday...');
        const response = await axios.get('https://api.football-data.org/v4/competitions/PL', {
            headers: {
                'X-Auth-Token': '84672de1d2e44717af5067329c586396'
            }
        });
        console.log('Current matchday from API:', response.data.currentSeason.currentMatchday);
        return response.data.currentSeason.currentMatchday;
    } catch (error) {
        console.error('Error fetching current matchday:', error);
        return null;
    }
};

module.exports = getCurrentMatchday;