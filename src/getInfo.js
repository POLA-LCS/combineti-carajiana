const fs = require('fs');

require('dotenv').config();
const SPORTS_API_KEY = process.env.SPORTS_API_KEY;

// Free trial solo permite que veamos el CID = 3 (UEFA Champions League)
const api_url_info = {
    MATCHES: "https://api.sportsdata.io/v4/soccer/scores/json/ScoresBasic/3",
    INJURED: "https://api.sportsdata.io/v4/soccer/projections/json/InjuredPlayers/3",
    PLAYERS: "https://api.sportsdata.io/v4/soccer/projections/json/PlayersByTeam/3",
};
const MAX_RETRIES = 5;
const OUTPUT_FILE = "todays-competitions-state.json";

function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchWithRetry(url, attempt = 1) {
    const delay = Math.pow(2, attempt - 1) * 1000;

    try {
        console.log(`Intento ${attempt}: Llamando a la API...`);
        const response = await fetch(url);

        if (response.status === 429) {
            if (attempt < MAX_RETRIES) {
                console.warn(`[!] Límite de tasa (429). Reintentando en ${delay / 1000} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, attempt + 1);
            } else {
                throw new Error(`[CRÍTICO] Fallo después de ${MAX_RETRIES} intentos debido al límite de tasa.`);
            }
        }

        if (!response.ok) {
            // Incluir el cuerpo de la respuesta en el error si es posible
            const errorBody = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}. Respuesta del cuerpo: ${errorBody.substring(0, 100)}...`);
        }

        return await response.json();

    } catch (error) {
        if (attempt < MAX_RETRIES && (error.code === 'ENOTFOUND' || error.message.includes('fetch failed'))) {
            console.warn(`[!] Error de red. Reintentando en ${delay / 1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, attempt + 1);
        }
        throw error;
    }
}


async function getPlayersByTeam(teamid, api_key) {
    const url = `${api_url_info.PLAYERS}/${teamid}?key=${api_key}`;

    const players_by_team = await fetchWithRetry(url);

    const players = {
        TotalPlayers: players_by_team.length,
        Players: players_by_team.map(player => ({
            Id: player.PlayerId,
            Name: {
                First: player.FirstName,
                Last: player.LastName,
                Common: player.CommonName,
                Short: player.ShortName,
            },
            Position: player.Position,
            Jersey: player.Jersey,
            Foot: player.Foot,
            PhotoUrl: player.PhotoUrl
        }))
    };

    return players;
}

async function getCompetitionInjured(api_key) {
    const url = `${api_url_info.INJURED}?key=${api_key}`;

    const injured_by_competition = await fetchWithRetry(url);

    const injured = {
        TotalInjured: players.length,
        Injured: injured_by_competition.map(player => ({
            Id: player.PlayerId
        }))
    };

    return injured;
}

async function getTodayMatches(date_string, api_key) {
    const url = `${api_url_info.MATCHES}/${date_string}?key=${api_key}`;

    const matches_today = await fetchWithRetry(url);

    const matches = {
        TotalMatches: matches_today.length,
        Matches: matches_today.map(match => ({
            GameId: match.GameId,
            DateTime: match.DateTime,
            Teams: {
                Home: {
                    Id: match.HomeTeamId,
                    Key: match.HomeTeamKey,
                    Name: match.HomeTeamName
                },
                Away: {
                    Id: match.AwayTeamId,
                    Key: match.AwayTeamKey,
                    Name: match.AwayTeamName
                }
            },
            Scores: {
                Home: {
                    Period1: match.HomeTeamScorePeriod1,
                    Period2: match.HomeTeamScorePeriod2,
                    Extra: match.HomeTeamScoreExtraTime,
                    Penalty: match.HomeTeamScorePenalty,
                },
                Away: {
                    Period1: match.AwayTeamScorePeriod1,
                    Period2: match.AwayTeamScorePeriod2,
                    Extra: match.AwayTeamScoreExtraTime,
                    Penalty: match.AwayTeamScorePenalty,
                }
            }
        }))
    };

    return matches;
}

function getTeamByKey(teams_info_json, key) {
    for (const team of teams_info_json)
        if (team.Key === key)
            return team;

    return null; // Retorna null si no encuentra el equipo
}

async function main() {
    if (!SPORTS_API_KEY) {
        console.error("ERROR: La API Key no está configurada. Asegúrate de tener un archivo .env con SPORTS_API_KEY.");
        process.exit(1);
    }

    const todayDate = getTodayDate();
    const competitions = await getTodayMatches(todayDate, SPORTS_API_KEY); // Obtener competiciones de hoy
    fs.writeFileSync('../data/' + OUTPUT_FILE, JSON.stringify(competitions, null, 2)); // Guardar en un archivo
    console.log(`Datos de competiciones de hoy guardados en ${OUTPUT_FILE}`); // Mensaje de confirmación
}

main();