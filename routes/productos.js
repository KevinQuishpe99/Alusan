import { obtenerProductosPorCategoria, hidratarProductosConImagenes } from '../services/perseoService.js';
import {
    agruparProductos,
    buscarCategoriaPorNombre,
    enriquecerProductosConNombresTaxonomia,
    obtenerMapaCategoriasPorId,
    obtenerMapaSubcategoriasPorId
} from '../utils/productUtils.js';
import { PERSEO_API_KEY, API_BASE_URL } from '../config/index.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { validarAlmacen } from '../services/almacenService.js';
import { logError } from '../utils/logger.js';

/**
 * Endpoint: POST /api/productos
 * Obtiene productos agrupados por código padre con imágenes y existencias
 */
export function setupProductosRoutes(app, cacheProductos, cacheCategorias) {
    app.post('/api/productos', authenticateApiKey, async (req, res) => {
        const categoriaId = req.body?.categoria_id;
        const categoriaNombre = req.body?.categoria_nombre;
        const almacenId = req.body?.almacen_id;

        if (!categoriaId && !categoriaNombre) {
            return res.status(400).json({
                success: false,
                message: "Debe proporcionar 'categoria_id' o 'categoria_nombre' en el body.",
                error: "PARAMETRO_FALTANTE"
            });
        }

        if (!almacenId) {
            return res.status(400).json({
                success: false,
                message: "El parámetro 'almacen_id' es obligatorio. Debe proporcionar el ID del almacén.",
                error: "PARAMETRO_FALTANTE",
                parametro_faltante: "almacen_id"
            });
        }

        const almacenIdNum = parseInt(almacenId);
        if (isNaN(almacenIdNum) || almacenIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "El 'almacen_id' debe ser un número válido mayor a 0.",
                error: "PARAMETRO_INVALIDO",
                almacen_id: almacenId
            });
        }

        const validacionAlmacen = await validarAlmacen(almacenIdNum);

        if (!validacionAlmacen.existe) {
            return res.status(404).json({
                success: false,
                message: `El almacén con ID ${almacenIdNum} no existe.`,
                error: "ALMACEN_NO_ENCONTRADO",
                almacen_id: almacenIdNum
            });
        }

        let categoriaIdNum = null;

        if (categoriaId) {
            const categoriaIdParseado = parseInt(categoriaId);
            if (!isNaN(categoriaIdParseado) && categoriaIdParseado > 0) {
                categoriaIdNum = categoriaIdParseado;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "El 'categoria_id' debe ser un número válido."
                });
            }
        } else if (categoriaNombre) {
            categoriaIdNum = await buscarCategoriaPorNombre(categoriaNombre, cacheCategorias, API_BASE_URL, PERSEO_API_KEY);

            if (!categoriaIdNum) {
                return res.status(404).json({
                    success: false,
                    message: `La categoría "${categoriaNombre}" no existe. Verifica que el nombre sea correcto.`,
                    error: "CATEGORIA_NO_ENCONTRADA",
                    categoria_nombre: categoriaNombre
                });
            }
        }

        const cacheKey = `productos_categoria_${categoriaIdNum}`;
        const cachedData = cacheProductos.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            if (!PERSEO_API_KEY || !API_BASE_URL) {
                throw new Error("Configuración incompleta: PERSEO_API_KEY o API_BASE_URL no están definidos");
            }

            const resPerseo = await obtenerProductosPorCategoria(categoriaIdNum);

            if (!resPerseo) {
                throw new Error("La respuesta de Perseo no contiene datos");
            }

            const productosRaw = resPerseo?.productos || [];

            if (productosRaw.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No se encontraron productos en la categoría ${categoriaIdNum}.`,
                    error: "PRODUCTOS_NO_ENCONTRADOS",
                    categoria_id: categoriaIdNum
                });
            }

            const productosHidratados = await hidratarProductosConImagenes(productosRaw, almacenIdNum);

            const [mapaCategorias, mapaSubcategorias] = await Promise.all([
                obtenerMapaCategoriasPorId(cacheCategorias),
                obtenerMapaSubcategoriasPorId(cacheCategorias)
            ]);
            const productosConNombres = enriquecerProductosConNombresTaxonomia(
                productosHidratados,
                mapaCategorias,
                mapaSubcategorias
            );

            const resultadoFinal = agruparProductos(productosConNombres);

            const resultado = {
                success: true,
                categoria_consultada: categoriaIdNum,
                categoria_consultada_nombre: mapaCategorias.get(categoriaIdNum) ?? null,
                total_grupos: resultadoFinal.length,
                items: resultadoFinal
            };

            cacheProductos.set(cacheKey, resultado);
            res.json(resultado);

        } catch (error) {
            logError('POST /api/productos:', error.message);

            if (error.response) {
                if (error.response.status === 404) {
                    return res.status(404).json({
                        success: false,
                        message: "La categoría solicitada no existe en Perseo.",
                        error: "CATEGORIA_NO_ENCONTRADA_EN_PERSEO",
                        status: error.response.status
                    });
                }

                res.status(error.response.status || 500).json({
                    success: false,
                    message: "Error al conectar con el servidor de Perseo.",
                    error: "ERROR_CONEXION_PERSEO",
                    detalles: error.response.data,
                    status: error.response.status
                });
            } else if (error.request) {
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo. Verifica tu conexión a internet.",
                    error: "ERROR_TIMEOUT_PERSEO"
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Error interno al procesar la solicitud.",
                    error: "ERROR_INTERNO",
                    detalles: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    type: error.name || 'UnknownError'
                });
            }
        }
    });
}
