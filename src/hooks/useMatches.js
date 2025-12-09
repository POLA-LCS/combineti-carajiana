// src/hooks/useMatches.js
import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '../services/cache';
import { getTodayMatches, getCompetitionInjured, getPlayersByTeam } from '../api/sportsdata';
import { SPORTS_API_KEY, GEMINI_API_KEY } from '@env';

if(!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no está definida. Las predicciones no van a funcionar.');
}

// --- CONSTANTES ---
const CACHE_KEYS = {
    MATCHES: 'matches_cache',
    INJURIES: 'injuries_cache',
    PLAYERS_HOME: 'players_home_cache', // Usamos claves dinámicas para los jugadores
    PLAYERS_AWAY: 'players_away_cache', // Usamos claves dinámicas para los jugadores
    PREDICTIONS: 'predictions_cache', // Usamos claves dinámicas para las predicciones
};
const CACHE_TTL = {
    // 24 horas para datos que no deberían cambiar mucho
    STATIC: 24 * 60 * 60 * 1000,
    // 5 minutos para datos de partidos que pueden cambiar de estado
    DYNAMIC: 5 * 60 * 1000,
};

/**
 * Hook personalizado para manejar la carga, caché y estado de los datos de partidos.
 */
export const useMatches = () => {
    const [matches, setMatches] = useState([]);
    const [injuredPlayers, setInjuredPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    /**
     * Revisa si los datos en caché todavía sirven, basándose en su TTL.
     * @param {number} timestamp - La marca de tiempo de los datos en caché.
     * @param {number} ttl - El tiempo de vida en milisegundos.
     * @returns {boolean} - True si la caché está fresca, false si no.
     */
    const isCacheFresh = (timestamp, ttl) => {
        if (!timestamp) return false;
        return (Date.now() - timestamp) < ttl;
    };

    /**
     * Función principal que trae todos los datos necesarios, usando la caché si se puede.
     */
    const loadMatchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Traer Partidos (Caché Dinámica)
            const cachedMatches = await getCache(CACHE_KEYS.MATCHES);
            let freshMatches = [];

            if (isCacheFresh(cachedMatches.timestamp, CACHE_TTL.DYNAMIC)) {
                console.log('[useMatches] Usando partidos de la caché.');
                freshMatches = cachedMatches.data;
                setLastFetch(cachedMatches.timestamp);
            } else {
                console.log('[useMatches] Pidiendo partidos nuevos a la API.');
                freshMatches = await getTodayMatches(SPORTS_API_KEY);
                await setCache(CACHE_KEYS.MATCHES, freshMatches);
                setLastFetch(Date.now());
            }
            
            // 2. Traer Jugadores Lesionados (Caché Estática)
            const cachedInjuries = await getCache(CACHE_KEYS.INJURIES);
            if (isCacheFresh(cachedInjuries.timestamp, CACHE_TTL.STATIC)) {
                console.log('[useMatches] Usando lesiones de la caché.');
                setInjuredPlayers(cachedInjuries.data);
            } else {
                console.log('[useMatches] Pidiendo datos de lesiones a la API.');
                const freshInjuries = await getCompetitionInjured(SPORTS_API_KEY);
                setInjuredPlayers(freshInjuries);
                await setCache(CACHE_KEYS.INJURIES, freshInjuries);
            }

            // 3. Traer secuencialmente las listas de jugadores para cada partido
            // Se hace así para no reventar el móvil del usuario ni las APIs.
            const matchesWithPlayers = await Promise.all(
                freshMatches.map(async (match) => {
                    const homeTeamId = match.homeTeam.id;
                    const awayTeamId = match.awayTeam.id;

                    // Traer jugadores del equipo local
                    const homePlayersCacheKey = `${CACHE_KEYS.PLAYERS_HOME}_${homeTeamId}`;
                    const cachedHomePlayers = await getCache(homePlayersCacheKey);
                    let homePlayers = [];
                    if (isCacheFresh(cachedHomePlayers.timestamp, CACHE_TTL.STATIC)) {
                        homePlayers = cachedHomePlayers.data;
                    } else {
                        homePlayers = await getPlayersByTeam(homeTeamId, SPORTS_API_KEY);
                        await setCache(homePlayersCacheKey, homePlayers);
                    }

                    // Traer jugadores del equipo visitante
                    const awayPlayersCacheKey = `${CACHE_KEYS.PLAYERS_AWAY}_${awayTeamId}`;
                    const cachedAwayPlayers = await getCache(awayPlayersCacheKey);
                    let awayPlayers = [];
                    if (isCacheFresh(cachedAwayPlayers.timestamp, CACHE_TTL.STATIC)) {
                        awayPlayers = cachedAwayPlayers.data;
                    } else {
                        awayPlayers = await getPlayersByTeam(awayTeamId, SPORTS_API_KEY);
                        await setCache(awayPlayersCacheKey, awayPlayers);
                    }

                    return { ...match, homePlayers, awayPlayers };
                })
            );

            setMatches(matchesWithPlayers);

        } catch (e) {
            console.error('[useMatches] Fallo al cargar los datos del partido:', e);
            setError(e.message || 'Ocurrió un error desconocido.');
            // Si la API falla pero hay caché, mostramos los datos viejos
            const cachedMatches = await getCache(CACHE_KEYS.MATCHES);
            if (cachedMatches.data) {
                setMatches(cachedMatches.data);
                setError("La API falló. Mostrando datos no actualizados.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Carga inicial cuando el componente se monta
    useEffect(() => {
        loadMatchData();
    }, [loadMatchData]);

    // Exponemos el estado y una función para refrescar a mano
    return { matches, injuredPlayers, isLoading, error, lastFetch, refreshMatches: loadMatchData };
};
