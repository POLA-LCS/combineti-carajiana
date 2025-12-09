// src/hooks/useMatchPrediction.js
import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '../services/cache';
import { generatePredictions } from '../api/gemini';
import { GEMINI_API_KEY } from '@env';

// --- CONSTANTES ---
const CACHE_KEYS = {
    PREDICTIONS: 'predictions_cache', 
};

/**
 * Hook para traer la predicción de un solo partido bajo demanda.
 * @param {object} match - El objeto del partido (debe incluir homePlayers y awayPlayers).
 * @param {Array<object>} injuredPlayers - La lista de todos los lesionados de la competición.
 */
export const useMatchPrediction = (match, injuredPlayers) => {
    const [prediction, setPrediction] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadPrediction = useCallback(async () => {
        if (!match || !injuredPlayers) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const predictionsCacheKey = `${CACHE_KEYS.PREDICTIONS}_${match.gameId}`;
            const cachedPrediction = await getCache(predictionsCacheKey);

            if (cachedPrediction.data) {
                console.log(`[useMatchPrediction] Usando predicción de caché para el partido: ${match.gameId}`);
                setPrediction(cachedPrediction.data);
            } else {
                console.log(`[useMatchPrediction] Pidiendo predicción a Gemini para el partido: ${match.gameId}`);
                const { homePlayers, awayPlayers } = match;
                const matchDataForGemini = { match, homePlayers, awayPlayers, injuredPlayers };
                
                const newPrediction = await generatePredictions(GEMINI_API_KEY, matchDataForGemini);
                
                if (newPrediction) {
                    setPrediction(newPrediction);
                    await setCache(predictionsCacheKey, newPrediction);
                } else {
                    throw new Error("No se pudo generar la predicción.");
                }
            }
        } catch (e) {
            console.error(`[useMatchPrediction] Falló la carga de la predicción para el partido ${match.gameId}:`, e);
            setError(e.message || 'Ocurrió un error desconocido.');
        } finally {
            setIsLoading(false);
        }
    }, [match, injuredPlayers]);

    useEffect(() => {
        loadPrediction();
    }, [loadPrediction]);

    return { prediction, isLoading, error, refreshPrediction: loadPrediction };
};
