import {
    PERSEO_API_KEY,
    API_BASE_URL,
    MAX_CONCURRENT_REQUESTS,
    MAX_CONCURRENT_COMPRESSION,
    CACHE_TTL_CATEGORIAS,
    CACHE_TTL_PRODUCTOS
} from '../config/index.js';
import { authenticateApiKey } from '../middleware/auth.js';

/**
 * @swagger
 * /api/health:
 *   post:
 *     summary: Verifica el estado del servidor y configuración
 *     tags: [Sistema]
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
 *         description: Estado del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 config:
 *                   type: object
 *       401:
 *         description: API key requerida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export function setupHealthRoute(app) {
    app.post('/api/health', authenticateApiKey, (req, res) => {
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

