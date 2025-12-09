// src/hooks/useMatches.js
import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '../services/cache';
import { getTodayMatches, getCompetitionInjured, getPlayersByTeam } from '../api/sportsdata';
import { generatePredictions } from '../api/gemini';
import { SPORTS_API_KEY, GEMINI_API_KEY } from '@env';

// --- CONSTANTS ---
const CACHE_KEYS = {
    MATCHES: 'matches_cache',
    INJURIES: 'injuries_cache',
    PLAYERS_HOME: 'players_home_cache', // Using dynamic keys for players
    PLAYERS_AWAY: 'players_away_cache', // Using dynamic keys for players
    PREDICTIONS: 'predictions_cache', // Using dynamic keys for predictions
};
const CACHE_TTL = {
    // 24 hours for data that is not expected to change often
    STATIC: 24 * 60 * 60 * 1000,
    // 5 minutes for match data that could change status
    DYNAMIC: 5 * 60 * 1000,
};

/**
 * Custom hook to manage fetching, caching, and state for match data.
 */
export const useMatches = () => {
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    /**
     * Checks if cached data is still valid based on its TTL.
     * @param {number} timestamp - The timestamp of the cached data.
     * @param {number} ttl - The time-to-live in milliseconds.
     * @returns {boolean} - True if the cache is fresh, false otherwise.
     */
    const isCacheFresh = (timestamp, ttl) => {
        if (!timestamp) return false;
        return (Date.now() - timestamp) < ttl;
    };

    /**
     * Main function to fetch all required data, using cache where possible.
     */
    const loadMatchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch Matches (Dynamic Cache)
            const cachedMatches = await getCache(CACHE_KEYS.MATCHES);
            let freshMatches = [];

            if (isCacheFresh(cachedMatches.timestamp, CACHE_TTL.DYNAMIC)) {
                console.log('[useMatches] Using cached matches.');
                freshMatches = cachedMatches.data;
                setLastFetch(cachedMatches.timestamp);
            } else {
                console.log('[useMatches] Fetching fresh matches from API.');
                freshMatches = await getTodayMatches(SPORTS_API_KEY);
                await setCache(CACHE_KEYS.MATCHES, freshMatches);
                setLastFetch(Date.now());
            }
            setMatches(freshMatches);

            // 2. Fetch Injured Players (Static Cache)
            const cachedInjuries = await getCache(CACHE_KEYS.INJURIES);
            let injuredPlayers = [];
            if (isCacheFresh(cachedInjuries.timestamp, CACHE_TTL.STATIC)) {
                console.log('[useMatches] Using cached injuries.');
                injuredPlayers = cachedInjuries.data;
            } else {
                console.log('[useMatches] Fetching fresh injury data from API.');
                injuredPlayers = await getCompetitionInjured(SPORTS_API_KEY);
                await setCache(CACHE_KEYS.INJURIES, injuredPlayers);
            }

            // 3. Sequentially fetch player lists and predictions for each match
            // This is done to avoid overwhelming the user's device and the APIs.
            const matchesWithDetails = await Promise.all(
                freshMatches.map(async (match) => {
                    const homeTeamId = match.homeTeam.id;
                    const awayTeamId = match.awayTeam.id;

                    // Fetch players for home team
                    const homePlayersCacheKey = `${CACHE_KEYS.PLAYERS_HOME}_${homeTeamId}`;
                    const cachedHomePlayers = await getCache(homePlayersCacheKey);
                    let homePlayers = [];
                    if (isCacheFresh(cachedHomePlayers.timestamp, CACHE_TTL.STATIC)) {
                        homePlayers = cachedHomePlayers.data;
                    } else {
                        homePlayers = await getPlayersByTeam(homeTeamId, SPORTS_API_KEY);
                        await setCache(homePlayersCacheKey, homePlayers);
                    }

                    // Fetch players for away team
                    const awayPlayersCacheKey = `${CACHE_KEYS.PLAYERS_AWAY}_${awayTeamId}`;
                    const cachedAwayPlayers = await getCache(awayPlayersCacheKey);
                    let awayPlayers = [];
                    if (isCacheFresh(cachedAwayPlayers.timestamp, CACHE_TTL.STATIC)) {
                        awayPlayers = cachedAwayPlayers.data;
                    } else {
                        awayPlayers = await getPlayersByTeam(awayTeamId, SPORTS_API_KEY);
                        await setCache(awayPlayersCacheKey, awayPlayers);
                    }

                    // Fetch predictions from Gemini
                    const predictionsCacheKey = `${CACHE_KEYS.PREDICTIONS}_${match.gameId}`;
                    const cachedPredictions = await getCache(predictionsCacheKey);
                    let predictions = null;
                    // Predictions are generated once and should not expire before the match
                    if (cachedPredictions.data) {
                        predictions = cachedPredictions.data;
                    } else {
                        const matchDataForGemini = { match, homePlayers, awayPlayers, injuredPlayers };
                        predictions = await generatePredictions(GEMINI_API_KEY, matchDataForGemini);
                        if (predictions) {
                            await setCache(predictionsCacheKey, predictions);
                        }
                    }

                    return { ...match, predictions };
                })
            );

            setMatches(matchesWithDetails);

        } catch (e) {
            console.error('[useMatches] Failed to load match data:', e);
            setError(e.message || 'An unknown error occurred.');
            // Fallback to cached matches if API fails but cache exists
            const cachedMatches = await getCache(CACHE_KEYS.MATCHES);
            if (cachedMatches.data) {
                setMatches(cachedMatches.data);
                setError("API failed. Displaying stale data.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load on component mount
    useEffect(() => {
        loadMatchData();
    }, [loadMatchData]);

    // Expose state and a manual refresh function to the component
    return { matches, isLoading, error, lastFetch, refreshMatches: loadMatchData };
};
