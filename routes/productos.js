import { obtenerProductosPorCategoria, hidratarProductosConImagenes } from '../services/perseoService.js';
import { agruparProductos, buscarCategoriaPorNombre } from '../utils/productUtils.js';
import { PERSEO_API_KEY, API_BASE_URL, CACHE_TTL_PRODUCTOS } from '../config/index.js';

/**
 * Endpoint: GET /api/productos/:id
 * Traer productos, sus imágenes en paralelo y agrupar por código padre.
 * Acepta tanto ID numérico como nombre de categoría
 */
export function setupProductosRoutes(app, cacheProductos, cacheCategorias) {
    app.get('/api/productos/:id', async (req, res) => {
        const categoriaParam = req.params.id;
        let categoriaIdNum = null;

        // 1. ENTRADA: Detectar si es ID numérico o nombre de categoría
        const categoriaIdParseado = parseInt(categoriaParam);
        
        if (!isNaN(categoriaIdParseado) && categoriaIdParseado > 0) {
            categoriaIdNum = categoriaIdParseado;
        } else {
            // Es un nombre, buscar el ID internamente
            console.log(`🔍 Buscando categoría por nombre: "${categoriaParam}"`);
            categoriaIdNum = await buscarCategoriaPorNombre(categoriaParam, cacheCategorias, API_BASE_URL, PERSEO_API_KEY);
            
            if (!categoriaIdNum) {
                return res.status(404).json({
                    success: false,
                    message: `No se encontró la categoría "${categoriaParam}". Verifica que el nombre sea correcto.`
                });
            }
            
            console.log(`✅ Categoría "${categoriaParam}" encontrada con ID: ${categoriaIdNum}`);
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
            console.log(`   📍 Origen: GET /api/productos/${categoriaIdNum}`);
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
                    message: "No se encontraron productos en esta categoría."
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

            // 3. Hidratar productos con imágenes
            const productosHidratados = await hidratarProductosConImagenes(productosRaw);

            // 4. Agrupación lógica en memoria
            const resultadoFinal = agruparProductos(productosHidratados);

            // Resumen completo
            const productosFinalesConId = productosHidratados.filter(p => 
                p.productosid || p.productoid || p.id
            ).length;
            const productosFinalesSinId = productosHidratados.length - productosFinalesConId;
            
            const gruposConVariantes = resultadoFinal.filter(g => g.tiene_variantes).length;
            const gruposSinVariantes = resultadoFinal.length - gruposConVariantes;
            const totalVariantes = resultadoFinal.reduce((sum, grupo) => sum + grupo.variantes.length, 0);
            
            const totalImagenesComprimidas = productosHidratados.reduce((sum, p) => sum + (p.imagenes_data?.length || 0), 0);
            const productosConImagenesFinal = productosHidratados.filter(p => p.imagenes_data && p.imagenes_data.length > 0).length;
            const productosSinImagenesFinal = productosHidratados.length - productosConImagenesFinal;
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
                res.status(error.response.status || 500).json({
                    success: false,
                    message: "Error al conectar con el servidor de Perseo.",
                    error: error.response.data,
                    status: error.response.status
                });
            } else if (error.request) {
                console.error("   No se recibió respuesta del servidor");
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo.",
                    error: "Timeout o error de red"
                });
            } else {
                console.error("   Error completo:", error);
                res.status(500).json({
                    success: false,
                    message: "Error al procesar la solicitud.",
                    error: process.env.NODE_ENV === 'development' ? error.message : "Error interno del servidor",
                    type: error.name || 'UnknownError'
                });
            }
        }
    });
}

