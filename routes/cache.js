import { CACHE_TTL_CATEGORIAS, CACHE_TTL_PRODUCTOS } from '../config/index.js';
import { authenticateApiKey } from '../middleware/auth.js';

/**
 * @swagger
 * /api/cache/stats:
 *   post:
 *     summary: Obtiene estadísticas del caché
 *     tags: [Cache]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *             properties:
 *               api_key:
 *                 type: string
 *                 example: ""
 *     responses:
 *       200:
 *         description: Estadísticas del caché
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 categorias:
 *                   type: object
 *                   properties:
 *                     keys:
 *                       type: integer
 *                       example: 5
 *                     hits:
 *                       type: integer
 *                       example: 120
 *                     misses:
 *                       type: integer
 *                       example: 10
 *                 productos:
 *                   type: object
 *       401:
 *         description: API key requerida
 *       403:
 *         description: API key inválida
 */
export function setupCacheRoutes(app, cacheCategorias, cacheProductos) {
    app.post('/api/cache/stats', authenticateApiKey, (req, res) => {
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
     * @swagger
     * /api/cache/clear:
     *   post:
     *     summary: Limpia todo el caché
     *     tags: [Cache]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - api_key
     *             properties:
     *               api_key:
     *                 type: string
     *                 example: ""
     *     responses:
     *       200:
     *         description: Caché limpiado correctamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Caché limpiado correctamente."
     *       401:
     *         description: API key requerida
     *       403:
     *         description: API key inválida
     */
    app.post('/api/cache/clear', authenticateApiKey, (req, res) => {
        cacheCategorias.flushAll();
        cacheProductos.flushAll();
        
        res.json({
            success: true,
            message: "Caché limpiado correctamente."
        });
    });
}

