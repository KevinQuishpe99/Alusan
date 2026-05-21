import { obtenerSubcategorias } from '../services/perseoService.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';

/**
 * Endpoints de subcategorías de productos
 */
export function setupSubcategoriasRoutes(app, cacheTaxonomia) {
    app.post('/api/subcategorias/list', authenticateApiKey, async (req, res) => {
        const cacheKey = 'subcategorias_list_simple';
        const cachedData = cacheTaxonomia.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const response = await obtenerSubcategorias();

            if (response?.subcategorias?.length) {
                const subcategoriasSimplificadas = response.subcategorias.map((sub) => ({
                    id: sub.productos_subcategoriasid,
                    nombre: sub.descripcion
                }));

                const resultado = {
                    success: true,
                    total: subcategoriasSimplificadas.length,
                    subcategorias: subcategoriasSimplificadas
                };

                cacheTaxonomia.set(cacheKey, resultado);
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: 'No se encontraron subcategorías.'
                });
            }
        } catch (error) {
            logError('POST /api/subcategorias/list:', error.message);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las subcategorías.'
            });
        }
    });

    app.post('/api/subcategorias', authenticateApiKey, async (req, res) => {
        const cacheKey = 'subcategorias_all';
        const cachedData = cacheTaxonomia.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const response = await obtenerSubcategorias();

            if (response?.subcategorias?.length) {
                const resultado = {
                    success: true,
                    total: response.subcategorias.length,
                    data: response.subcategorias
                };

                cacheTaxonomia.set(cacheKey, resultado);
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: 'No se encontraron subcategorías en Perseo.'
                });
            }
        } catch (error) {
            logError('POST /api/subcategorias:', error.message);
            if (error.response) {
                res.status(error.response.status || 500).json({
                    success: false,
                    message: 'Error al conectar con el servidor de Perseo.',
                    error: error.response.data
                });
            } else if (error.request) {
                res.status(503).json({
                    success: false,
                    message: 'No se pudo conectar con el servidor de Perseo.',
                    error: 'ERROR_TIMEOUT_PERSEO'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Error al procesar la solicitud.',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    type: error.name || 'UnknownError'
                });
            }
        }
    });
}
