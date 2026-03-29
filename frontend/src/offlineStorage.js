const PRODUCTS_STORAGE_KEY = 'sierra97_products_cache';
const PRODUCTS_TIMESTAMP_KEY = 'sierra97_products_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const offlineStorage = {
    saveProducts: (products) => {
        try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
            localStorage.setItem(PRODUCTS_TIMESTAMP_KEY, Date.now().toString());
            return true;
        } catch (error) {
            console.error('Failed to save products to localStorage:', error);
            return false;
        }
    },

    getProducts: () => {
        try {
            const products = localStorage.getItem(PRODUCTS_STORAGE_KEY);
            const timestamp = localStorage.getItem(PRODUCTS_TIMESTAMP_KEY);

            if (!products) return null;

            if (timestamp) {
                const age = Date.now() - parseInt(timestamp, 10);
                if (age > CACHE_DURATION) {
                    console.log('Offline cache expired');
                    return null;
                }
            }

            return JSON.parse(products);
        } catch (error) {
            console.error('Failed to get products from localStorage:', error);
            return null;
        }
    },

    isOnline: () => {
        return navigator.onLine;
    },

    getProductById: (productId) => {
        const products = offlineStorage.getProducts();
        if (!products) return null;
        return products.find(p => p.id === productId) || null;
    },

    clearCache: () => {
        try {
            localStorage.removeItem(PRODUCTS_STORAGE_KEY);
            localStorage.removeItem(PRODUCTS_TIMESTAMP_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    },

    hasCache: () => {
        return localStorage.getItem(PRODUCTS_STORAGE_KEY) !== null;
    }
};

export default offlineStorage;