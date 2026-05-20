import { obtenerCategorias } from '../services/perseoService.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';

/**
 * Endpoints de categorías
 */
export function setupCategoriasRoutes(app, cacheCategorias) {
    app.post('/api/categorias/list', authenticateApiKey, async (req, res) => {
        const cacheKey = 'categorias_list_simple';
        const cachedData = cacheCategorias.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const response = await obtenerCategorias();

            if (response && response.categorias) {
                const categoriasSimplificadas = response.categorias.map(cat => ({
                    id: cat.productos_categoriasid,
                    nombre: cat.descripcion
                }));

                const resultado = {
                    success: true,
                    total: categoriasSimplificadas.length,
                    categorias: categoriasSimplificadas
                };

                cacheCategorias.set(cacheKey, resultado);
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron categorías."
                });
            }
        } catch (error) {
            logError('POST /api/categorias/list:', error.message);
            res.status(500).json({
                success: false,
                message: "Error al obtener las categorías."
            });
        }
    });

    app.post('/api/categorias', authenticateApiKey, async (req, res) => {
        const cacheKey = 'categorias_all';
        const cachedData = cacheCategorias.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const response = await obtenerCategorias();

            if (response && response.categorias) {
                const resultado = {
                    success: true,
                    data: response.categorias
                };

                cacheCategorias.set(cacheKey, resultado);
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron categorías en Perseo."
                });
            }
        } catch (error) {
            logError('POST /api/categorias:', error.message);
            if (error.response) {
                res.status(error.response.status || 500).json({
                    success: false,
                    message: "Error al conectar con el servidor de Perseo.",
                    error: error.response.data
                });
            } else if (error.request) {
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo."
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Error al procesar la solicitud.",
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    type: error.name || 'UnknownError'
                });
            }
        }
    });
}
