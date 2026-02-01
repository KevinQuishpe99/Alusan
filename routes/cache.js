import { CACHE_TTL_CATEGORIAS, CACHE_TTL_PRODUCTOS } from '../config/index.js';

/**
 * Endpoint: GET /api/cache/stats
 * Ver estadísticas del caché
 */
export function setupCacheRoutes(app, cacheCategorias, cacheProductos) {
    app.get('/api/cache/stats', (req, res) => {
        const statsCategorias = cacheCategorias.getStats();
        const statsProductos = cacheProductos.getStats();

        res.json({
            success: true,
            categorias: {
                keys: statsCategorias.keys || 0,
                hits: statsCategorias.hits || 0,
                misses: statsCategorias.misses || 0,
                ttl: CACHE_TTL_CATEGORIAS
            },
            productos: {
                keys: statsProductos.keys || 0,
                hits: statsProductos.hits || 0,
                misses: statsProductos.misses || 0,
                ttl: CACHE_TTL_PRODUCTOS
            }
        });
    });

    /**
     * Endpoint: DELETE /api/cache/clear
     * Limpiar todo el caché
     */
    app.delete('/api/cache/clear', (req, res) => {
        cacheCategorias.flushAll();
        cacheProductos.flushAll();
        
        res.json({
            success: true,
            message: "Caché limpiado correctamente."
        });
    });
}

