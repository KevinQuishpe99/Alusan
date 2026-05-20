import { obtenerProductosPorCategoria, hidratarProductosConImagenes } from '../services/perseoService.js';
import {
    agruparProductos,
    buscarCategoriaPorNombre,
    enriquecerProductosConNombresTaxonomia,
    obtenerMapaCategoriasPorId,
    obtenerMapaSubcategoriasPorId
} from '../utils/productUtils.js';
import { PERSEO_API_KEY, API_BASE_URL, CACHE_TTL_PRODUCTOS } from '../config/index.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { validarAlmacen } from '../services/almacenService.js';

/**
 * Endpoint: POST /api/productos
 * Obtiene productos agrupados por código padre con imágenes y existencias
 * Trae productos, descarga imágenes en paralelo, las comprime a WebP, consulta existencias del almacén y agrupa por código padre
 */
export function setupProductosRoutes(app, cacheProductos, cacheCategorias) {
    app.post('/api/productos', authenticateApiKey, async (req, res) => {
        // Obtener categoría del body (puede ser ID o nombre)
        const categoriaId = req.body?.categoria_id;
        const categoriaNombre = req.body?.categoria_nombre;
        const almacenId = req.body?.almacen_id;
        
        // Validar que al menos uno esté presente (categoria_id o categoria_nombre)
        if (!categoriaId && !categoriaNombre) {
            return res.status(400).json({
                success: false,
                message: "Debe proporcionar 'categoria_id' o 'categoria_nombre' en el body.",
                error: "PARAMETRO_FALTANTE"
            });
        }
        
        // Validar que almacen_id esté presente
        if (!almacenId) {
            return res.status(400).json({
                success: false,
                message: "El parámetro 'almacen_id' es obligatorio. Debe proporcionar el ID del almacén.",
                error: "PARAMETRO_FALTANTE",
                parametro_faltante: "almacen_id"
            });
        }
        
        // Validar que almacen_id sea un número válido
        const almacenIdNum = parseInt(almacenId);
        if (isNaN(almacenIdNum) || almacenIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "El 'almacen_id' debe ser un número válido mayor a 0.",
                error: "PARAMETRO_INVALIDO",
                almacen_id: almacenId
            });
        }

        // 1. VALIDAR ALMACÉN PRIMERO
        console.log(`🔍 Validando almacén ID: ${almacenIdNum}...`);
        const validacionAlmacen = await validarAlmacen(almacenIdNum);
        
        if (!validacionAlmacen.existe) {
            return res.status(404).json({
                success: false,
                message: `El almacén con ID ${almacenIdNum} no existe.`,
                error: "ALMACEN_NO_ENCONTRADO",
                almacen_id: almacenIdNum
            });
        }
        
        console.log(`✅ Almacén validado: ${validacionAlmacen.nombre} (ID: ${almacenIdNum})`);
        
        let categoriaIdNum = null;

        // 1. ENTRADA: Detectar si es ID numérico o nombre de categoría
        if (categoriaId) {
            // Si viene categoria_id, usarlo directamente
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
            // Es un nombre, buscar el ID internamente
            console.log(`🔍 Buscando categoría por nombre: "${categoriaNombre}"`);
            categoriaIdNum = await buscarCategoriaPorNombre(categoriaNombre, cacheCategorias, API_BASE_URL, PERSEO_API_KEY);
            
            if (!categoriaIdNum) {
                return res.status(404).json({
                    success: false,
                    message: `La categoría "${categoriaNombre}" no existe. Verifica que el nombre sea correcto.`,
                    error: "CATEGORIA_NO_ENCONTRADA",
                    categoria_nombre: categoriaNombre
                });
            }
            
            console.log(`✅ Categoría "${categoriaNombre}" encontrada con ID: ${categoriaIdNum}`);
        }

        const cacheKey = `productos_categoria_${categoriaIdNum}`;
        
        // Verificar caché primero
        const cachedData = cacheProductos.get(cacheKey);
        if (cachedData) {
            console.log(`✅ Productos de categoría ${categoriaIdNum} servidos desde caché`);
            return res.json(cachedData);
        }

        try {
            console.log(`🔄 Procesando productos de categoría ${categoriaIdNum}...`);
            const inicioTiempo = Date.now();

            // Validar configuración
            if (!PERSEO_API_KEY || !API_BASE_URL) {
                throw new Error("Configuración incompleta: PERSEO_API_KEY o API_BASE_URL no están definidos");
            }

            // 2. Consulta base de productos
            const urlProductos = `${API_BASE_URL}/productos_consulta`;
            console.log(`\n📡 PETICIÓN INTERNA #1: Consulta de productos`);
            console.log(`   🔗 URL: ${urlProductos}`);
            console.log(`   📍 Origen: POST /api/productos`);
            console.log(`   📦 Parámetros: categoriasid=${categoriaIdNum}`);
            console.log(`   ⏱️  Iniciando petición...`);
            
            const inicioConsultaProductos = Date.now();
            const resPerseo = await obtenerProductosPorCategoria(categoriaIdNum);
            
            const tiempoConsultaProductos = ((Date.now() - inicioConsultaProductos) / 1000).toFixed(2);
            console.log(`   ✅ Respuesta recibida en ${tiempoConsultaProductos}s`);
            console.log(`   📦 Productos encontrados: ${resPerseo?.productos?.length || 0}`);

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

            // Log de diagnóstico
            if (productosRaw.length > 0) {
                const primerProducto = productosRaw[0];
                console.log(`📦 ${productosRaw.length} productos encontrados`);
                console.log(`🔍 Estructura del primer producto:`, {
                    keys: Object.keys(primerProducto),
                    productosid: primerProducto.productosid,
                    productoid: primerProducto.productoid,
                    id: primerProducto.id,
                    productocodigo: primerProducto.productocodigo
                });
                
                const productosConId = productosRaw.filter(prod => 
                    prod.productosid || prod.productoid || prod.id
                );
                const productosSinId = productosRaw.length - productosConId.length;
                
                const codigosPadreUnicos = new Set();
                productosRaw.forEach(prod => {
                    const codigo = prod.productocodigo || '';
                    const codigoPadre = codigo.includes('-') ? codigo.split('-')[0] : codigo;
                    if (codigoPadre) codigosPadreUnicos.add(codigoPadre);
                });
                
                console.log(`\n📊 RESUMEN INICIAL:`);
                console.log(`   📦 Total productos recibidos: ${productosRaw.length}`);
                console.log(`   ✅ Productos CON ID: ${productosConId.length}`);
                console.log(`   ❌ Productos SIN ID: ${productosSinId}`);
                console.log(`   🔑 Códigos padre únicos: ${codigosPadreUnicos.size}`);
            }

            console.log(`🚀 Iniciando hidratación de imágenes (optimizado para velocidad)...`);
            console.log(`🏪 Almacén configurado para existencias: ID ${almacenIdNum}`);

            // 3. Hidratar productos con imágenes y existencias
            const productosHidratados = await hidratarProductosConImagenes(productosRaw, almacenIdNum);

            // 3b. Resolver nombres de categoría y subcategoría (consultas en caché)
            console.log(`📂 Resolviendo nombres de categorías y subcategorías...`);
            const [mapaCategorias, mapaSubcategorias] = await Promise.all([
                obtenerMapaCategoriasPorId(cacheCategorias),
                obtenerMapaSubcategoriasPorId(cacheCategorias)
            ]);
            const productosConNombres = enriquecerProductosConNombresTaxonomia(
                productosHidratados,
                mapaCategorias,
                mapaSubcategorias
            );

            // 4. Agrupación lógica en memoria
            const resultadoFinal = agruparProductos(productosConNombres);

            // Resumen completo
            const productosFinalesConId = productosConNombres.filter(p => 
                p.productosid || p.productoid || p.id
            ).length;
            const productosFinalesSinId = productosConNombres.length - productosFinalesConId;
            
            const gruposConVariantes = resultadoFinal.filter(g => g.tiene_variantes).length;
            const gruposSinVariantes = resultadoFinal.length - gruposConVariantes;
            const totalVariantes = resultadoFinal.reduce((sum, grupo) => sum + grupo.variantes.length, 0);
            
            const totalImagenesComprimidas = productosConNombres.reduce((sum, p) => sum + (p.imagenes_data?.length || 0), 0);
            const productosConImagenesFinal = productosConNombres.filter(p => p.imagenes_data && p.imagenes_data.length > 0).length;
            const productosSinImagenesFinal = productosConNombres.length - productosConImagenesFinal;
            const tiempoTotal = ((Date.now() - inicioTiempo) / 1000).toFixed(2);
            
            console.log(`\n⚡ OPTIMIZACIÓN COMPLETA:`);
            console.log(`   ⏱️  TOTAL: ${tiempoTotal}s`);
            
            console.log(`\n📊 RESUMEN FINAL DETALLADO:`);
            console.log(`   📦 Total productos recibidos: ${productosRaw.length}`);
            console.log(`   ✅ Productos CON ID: ${productosFinalesConId}`);
            console.log(`   ❌ Productos SIN ID: ${productosFinalesSinId}`);
            console.log(`   🔑 Total códigos padre (grupos): ${resultadoFinal.length}`);
            console.log(`   🔄 Grupos CON variantes: ${gruposConVariantes}`);
            console.log(`   📌 Grupos SIN variantes: ${gruposSinVariantes}`);
            console.log(`   📋 Total variantes en grupos: ${totalVariantes}`);
            console.log(`   🖼️  Productos con imágenes: ${productosConImagenesFinal}, sin imágenes: ${productosSinImagenesFinal}`);
            console.log(`   🖼️  Total imágenes comprimidas: ${totalImagenesComprimidas}\n`);

            // 5. SALIDA: JSON refactorizado y optimizado
            const resultado = {
                success: true,
                categoria_consultada: categoriaIdNum,
                categoria_consultada_nombre: mapaCategorias.get(categoriaIdNum) ?? null,
                total_grupos: resultadoFinal.length,
                items: resultadoFinal
            };

            // Guardar en caché
            cacheProductos.set(cacheKey, resultado);
            console.log(`💾 Resultado guardado en caché (TTL: ${CACHE_TTL_PRODUCTOS}s)`);

            res.json(resultado);

        } catch (error) {
            console.error("❌ Error en procesamiento de productos:");
            console.error("   Mensaje:", error.message);
            console.error("   Tipo:", error.name);
            console.error("   Stack:", error.stack);
            
            if (error.response) {
                console.error("   Status HTTP:", error.response.status);
                console.error("   Data:", error.response.data);
                
                // Errores específicos de Perseo
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
                console.error("   No se recibió respuesta del servidor");
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo. Verifica tu conexión a internet.",
                    error: "ERROR_TIMEOUT_PERSEO"
                });
            } else {
                console.error("   Error completo:", error);
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

