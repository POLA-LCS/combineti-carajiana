// src/api/gemini.js
// This module is responsible for interactions with the Google Gemini API.

// This is a placeholder for the actual Gemini API endpoint.
// The user might need to adjust this based on their specific setup (e.g., using a specific model).
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

/**
 * Builds the detailed prompt for the Gemini API.
 * @param {object} match - The match data.
 * @param {Array<object>} homePlayers - List of players for the home team.
 * @param {Array<object>} awayPlayers - List of players for the away team.
 * @param {Array<object>} injuredPlayers - List of all injured players in the competition.
 * @returns {string} The formatted prompt string.
 */
function buildPrompt(match, homePlayers, awayPlayers, injuredPlayers) {
    const homeTeamName = match.homeTeam.name;
    const awayTeamName = match.awayTeam.name;

    const getTeamInjuries = (teamId) =>
        injuredPlayers
            .filter(p => p.teamId === teamId)
            .map(p => `${p.name} (${p.injuryBodyPart})`)
            .join(', ') || 'None';

    const homeInjuries = getTeamInjuries(match.homeTeam.id);
    const awayInjuries = getTeamInjuries(match.awayTeam.id);

    // This is the core prompt engineering based on the research.
    // It's in English to save tokens and provides a clear structure for the AI.
    const prompt = `
You are an expert sports betting analyst. Your task is to provide three betting predictions for an upcoming football match.
Analyze the provided data and generate a raw JSON object as a response, with no additional text, explanations, or markdown.

Match Data:
- Home Team: ${homeTeamName}
- Away Team: ${awayTeamName}
- Competition: UEFA Champions League

Team Information:
- ${homeTeamName} Players: ${homePlayers.length} players available.
- ${awayTeamName} Players: ${awayPlayers.length} players available.
- ${homeTeamName} Injuries: ${homeInjuries}
- ${awayTeamName} Injuries: ${awayInjuries}

Based on this data, provide a JSON object with a single key "predictions".
This key should contain an array of three prediction objects, each with the following structure:
- level: "Conservative", "Balanced", or "High-Risk".
- description: A brief, one-sentence description of the bet type.
- confidence_score: A number between 0.0 and 1.0 representing your confidence.
- justification: A concise explanation for your prediction, referencing the provided data (like key injuries).
- bets: An array of 2-3 specific, realistic betting markets (e.g., "Under 2.5 total goals", "Both teams to score: YES", "${homeTeamName} to win").
- suggested_multiplier: A realistic number for the combined odds of the bets.

The entire response must be a single, raw JSON object and nothing else.
`;

    // The Gemini API expects a specific JSON structure for the request body.
    return JSON.stringify({
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json", // This specifically requests a JSON response
        }
    });
}

/**
 * Calls the Gemini API to generate betting predictions for a given match.
 * @param {string} apiKey - The API key for the Gemini API.
 * @param {object} matchData - An object containing the match, players, and injury data.
 * @returns {Promise<object|null>} The parsed JSON prediction object from Gemini, or null on failure.
 */
export async function generatePredictions(apiKey, matchData) {
    const { match, homePlayers, awayPlayers, injuredPlayers } = matchData;

    const body = buildPrompt(match, homePlayers, awayPlayers, injuredPlayers);

    try {
        console.log('[Gemini API] Generating predictions for match:', match.gameId);
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errorBody}`);
        }

        const responseJson = await response.json();

        // The Gemini API wraps the response. We need to extract the actual text content.
        const rawContent = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawContent) {
            console.error('[Gemini API] Failed to extract content from response:', responseJson);
            throw new Error("Invalid response structure from Gemini API.");
        }

        // The final step is to parse the string content, which should be our JSON.
        return JSON.parse(rawContent);

    } catch (error) {
        console.error('[Gemini API] Failed to generate predictions:', error);
        return null;
    }
}
