import {
    PERSEO_API_KEY,
    API_BASE_URL,
    MAX_CONCURRENT_REQUESTS,
    MAX_CONCURRENT_COMPRESSION,
    CACHE_TTL_CATEGORIAS,
    CACHE_TTL_PRODUCTOS
} from '../config/index.js';

/**
 * Endpoint: GET /api/health
 * Verifica el estado del servidor y configuración
 */
export function setupHealthRoute(app) {
    app.get('/api/health', (req, res) => {
        const config = {
            apiKeyConfigured: !!PERSEO_API_KEY,
            apiBaseUrlConfigured: !!API_BASE_URL,
            apiBaseUrl: API_BASE_URL,
            maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
            maxConcurrentCompression: MAX_CONCURRENT_COMPRESSION,
            cacheEnabled: true,
            cacheTTLCategorias: CACHE_TTL_CATEGORIAS,
            cacheTTLProductos: CACHE_TTL_PRODUCTOS
        };

        res.json({
            success: true,
            status: "ok",
            timestamp: new Date().toISOString(),
            config: config
        });
    });
}

