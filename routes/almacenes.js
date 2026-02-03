import { obtenerAlmacenes } from '../services/almacenService.js';
import { authenticateApiKey } from '../middleware/auth.js';

/**
 * Endpoint: POST /api/almacenes
 * Lista todos los almacenes disponibles en Perseo
 */
export function setupAlmacenesRoutes(app) {
    app.post('/api/almacenes', authenticateApiKey, async (req, res) => {
        try {
            console.log(`\n📡 PETICIÓN INTERNA: Consulta de almacenes`);
            console.log(`   📍 Origen: POST /api/almacenes`);
            console.log(`   ⏱️  Iniciando petición...`);
            
            const inicioConsulta = Date.now();
            const almacenes = await obtenerAlmacenes();
            
            const tiempoConsulta = ((Date.now() - inicioConsulta) / 1000).toFixed(2);
            console.log(`   ✅ Respuesta recibida en ${tiempoConsulta}s`);
            console.log(`   📦 Almacenes encontrados: ${almacenes.length}`);

            if (almacenes && almacenes.length > 0) {
                // Formatear respuesta
                const almacenesFormateados = almacenes.map(alm => ({
                    id: alm.almacenesid,
                    nombre: alm.descripcion
                }));

                const resultado = {
                    success: true,
                    total: almacenesFormateados.length,
                    almacenes: almacenesFormateados
                };
                
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron almacenes en Perseo.",
                    error: "ALMACENES_NO_ENCONTRADOS"
                });
            }
        } catch (error) {
            console.error("Error al obtener almacenes:", error.message);
            
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

