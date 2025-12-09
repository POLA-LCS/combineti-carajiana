



import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retrieves an item from the cache.
 * @param {string} key - The key of the item to retrieve.
 * @returns {Promise<{ data: any | null, timestamp: number | null }>} An object containing the cached data and its timestamp, or nulls if not found.
 */
export const getCache = async (key) => {
    try {
        const jsonValue = await AsyncStorage.getItem(key);
        if (jsonValue !== null) {
            const { timestamp, data } = JSON.parse(jsonValue);
            return { data, timestamp };
        }
        return { data: null, timestamp: null };
    } catch (e) {
        console.error(`[Cache Service] Failed to retrieve item for key "${key}":`, e);
        return { data: null, timestamp: null };
    }
};

/**
 * Stores an item in the cache with a current timestamp.
 * @param {string} key - The key to store the item under.
 * @param {any} data - The data to be stored. Must be JSON serializable.
 * @returns {Promise<boolean>} A boolean indicating if the operation was successful.
 */
export const setCache = async (key, data) => {
    try {
        const item = {
            timestamp: Date.now(),
            data,
        };
        const jsonValue = JSON.stringify(item);
        await AsyncStorage.setItem(key, jsonValue);
        return true;
    } catch (e) {
        console.error(`[Cache Service] Failed to save item for key "${key}":`, e);
        return false;
    }
};

/**
 * Clears a specific item from the cache.
 * @param {string} key - The key of the item to remove.
 * @returns {Promise<void>}
 */
export const clearCacheItem = async (key) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (e) {
        console.error(`[Cache Service] Failed to clear item for key "${key}":`, e);
    }
};

/**
 * Clears the entire AsyncStorage. Use with caution.
 * @returns {Promise<void>}
 */
export const clearAllCache = async () => {
    try {
        await AsyncStorage.clear();
    } catch (e) {
        console.error('[Cache Service] Failed to clear the entire cache:', e);
    }
};
