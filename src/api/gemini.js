// src/api/gemini.js
// Este módulo se encarga de todo el rollo con la API de Google Gemini.
import { GoogleGenAI } from "@google/genai";

/**
 * Monta el prompt detallado para la API de Gemini.
 * @param {object} match - Los datos del partido.
 * @param {Array<object>} homePlayers - La lista de jugadores del equipo local.
 * @param {Array<object>} awayPlayers - La lista de jugadores del equipo visitante.
 * @param {Array<object>} injuredPlayers - La lista de todos los lesionados en la competición.
 * @returns {string} El string del prompt ya formateado.
 */
function buildPrompt(match, homePlayers, awayPlayers, injuredPlayers) {
    const homeTeamName = match.homeTeam.name;
    const awayTeamName = match.awayTeam.name;

    const getTeamInjuries = (teamId) =>
        injuredPlayers
        .filter(p => p.teamId === teamId)
        .map(p => `${p.name} (${p.injuryBodyPart})`)
        .join(', ') || 'Ninguna';

    const homeInjuries = getTeamInjuries(match.homeTeam.id);
    const awayInjuries = getTeamInjuries(match.awayTeam.id);

    // Este es el prompt posta, el que le manda la info a la IA.
    // Está en inglés para ahorrar tokens y darle una estructura clara.
    return `
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
}

/**
 * Llama a la API de Gemini para generar predicciones para un partido.
 * @param {string} apiKey - La clave de API para Gemini.
 * @param {object} matchData - Un objeto con los datos del partido, jugadores y lesionados.
 * @returns {Promise<object|null>} El objeto JSON con la predicción, o null si falla.
 */
export async function generatePredictions(apiKey, matchData) {
    const { match, homePlayers, awayPlayers, injuredPlayers } = matchData;
    const genAI = new GoogleGenAI({apiKey: apiKey});

    const prompt = buildPrompt(match, homePlayers, awayPlayers, injuredPlayers);

    try {
        console.log('[Gemini API] Generando predicciones para el partido:', match.gameId);
        const result = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt
        });
        return JSON.parse(result.text);
    } catch (error) {
        console.error('[Gemini API] Falló la generación de predicciones:', error);
        return null;
    }
}