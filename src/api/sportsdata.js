





const API_BASE_URLS = {
    SCORES: "https://api.sportsdata.io/v4/soccer/scores/json",
    PROJECTIONS: "https://api.sportsdata.io/v4/soccer/projections/json",
};


const COMPETITION_ID = 3;
const MAX_RETRIES = 3; // Reduced for mobile context to avoid long waits

/**
 * A utility function to get the current date in YYYY-MM-DD format.
 * @returns {string} The formatted date string.
 */
function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * A robust fetch wrapper that handles retries with exponential backoff.
 * Useful for handling transient network errors or API rate limits (429).
 * @param {string} url The URL to fetch.
 * @param {number} attempt The current retry attempt number.
 * @returns {Promise<any>} The JSON response from the API.
 */
async function fetchWithRetry(url, attempt = 1) {
    const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...

    try {
        console.log(`[SportsData API] Attempt ${attempt}: Fetching ${url}`);
        const response = await fetch(url);

        if (response.status === 429) {
            if (attempt < MAX_RETRIES) {
                console.warn(`[SportsData API] Rate limit hit. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, attempt + 1);
            } else {
                throw new Error(`Failed after ${MAX_RETRIES} attempts due to API rate limiting.`);
            }
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}. Body: ${errorBody.substring(0, 200)}`);
        }

        return await response.json();

    } catch (error) {
        // Retry on specific network errors
        if (attempt < MAX_RETRIES && (error.name === 'TypeError' || (error.message && error.message.includes('Network request failed')))) {
            console.warn(`[SportsData API] Network error. Retrying in ${delay / 1000}s...`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, attempt + 1);
        }
        // For other errors, fail immediately
        throw error;
    }
}

/**
 * Fetches all scheduled matches for today for the specified competition.
 * @param {string} apiKey - The API key for sportsdata.io.
 * @returns {Promise<Array<object>>} A list of match objects.
 */
export async function getTodayMatches(apiKey) {
    const today = getTodayDate();
    const url = `${API_BASE_URLS.SCORES}/ScoresBasic/${COMPETITION_ID}/${today}?key=${apiKey}`;
    const matchesToday = await fetchWithRetry(url);


    return matchesToday.map(match => ({
        gameId: match.GameId,
        dateTime: match.DateTime,
        status: match.Status,
        homeTeam: {
            id: match.HomeTeamId,
            key: match.HomeTeamKey,
            name: match.HomeTeamName,
        },
        awayTeam: {
            id: match.AwayTeamId,
            key: match.AwayTeamKey,
            name: match.AwayTeamName,
        },
        scores: {
            home: match.HomeTeamScore,
            away: match.AwayTeamScore,
        }
    }));
}

/**
 * Fetches all injured players for the specified competition.
 * @param {string} apiKey - The API key for sportsdata.io.
 * @returns {Promise<Array<object>>} A list of injured player objects.
 */
export async function getCompetitionInjured(apiKey) {
    const url = `${API_BASE_URLS.PROJECTIONS}/InjuredPlayers/${COMPETITION_ID}?key=${apiKey}`;
    const injuredByCompetition = await fetchWithRetry(url);

    return injuredByCompetition.map(player => ({
        playerId: player.PlayerId,
        teamId: player.TeamId,
        name: player.ShortName,
        injuryStatus: player.InjuryStatus,
        injuryBodyPart: player.InjuryBodyPart,
    }));
}

/**
 * Fetches the list of players for a specific team.
 * @param {number} teamId - The ID of the team.
 * @param {string} apiKey - The API key for sportsdata.io.
 * @returns {Promise<Array<object>>} A list of player objects for the team.
 */
export async function getPlayersByTeam(teamId, apiKey) {
    if (!teamId) throw new Error("A valid teamId must be provided.");
    const url = `${API_BASE_URLS.SCORES}/PlayersByTeam/3/${teamId}?key=${apiKey}`;
    const playersByTeam = await fetchWithRetry(url);

    return playersByTeam.map(player => ({
        playerId: player.PlayerId,
        firstName: player.FirstName,
        lastName: player.LastName,
        commonName: player.CommonName,
        position: player.Position,
        jersey: player.Jersey,
        photoUrl: player.PhotoUrl,
    }));
}
