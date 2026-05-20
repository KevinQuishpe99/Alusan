import { obtenerAlmacenes } from '../services/almacenService.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';

/**
 * Endpoint: POST /api/almacenes
 */
export function setupAlmacenesRoutes(app) {
    app.post('/api/almacenes', authenticateApiKey, async (req, res) => {
        try {
            const almacenes = await obtenerAlmacenes();

            if (almacenes && almacenes.length > 0) {
                const almacenesFormateados = almacenes.map(alm => ({
                    id: alm.almacenesid,
                    nombre: alm.descripcion
                }));

                res.json({
                    success: true,
                    total: almacenesFormateados.length,
                    almacenes: almacenesFormateados
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron almacenes en Perseo.",
                    error: "ALMACENES_NO_ENCONTRADOS"
                });
            }
        } catch (error) {
            logError('POST /api/almacenes:', error.message);

            if (error.response) {
                res.status(error.response.status || 500).json({
                    success: false,
                    message: "Error al conectar con el servidor de Perseo.",
                    error: "ERROR_CONEXION_PERSEO",
                    detalles: error.response.data
                });
            } else if (error.request) {
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo.",
                    error: "ERROR_TIMEOUT_PERSEO"
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Error al procesar la solicitud.",
                    error: "ERROR_INTERNO",
                    detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    });
}
