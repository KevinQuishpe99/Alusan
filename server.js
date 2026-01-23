import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import sharp from 'sharp';
import pLimit from 'p-limit';
import NodeCache from 'node-cache';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging para todas las peticiones HTTP entrantes
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🌐 PETICIÓN HTTP ENTRANTE [${timestamp}]`);
    console.log(`   📍 Método: ${req.method}`);
    console.log(`   🔗 URL: ${req.originalUrl || req.url}`);
    console.log(`   🌍 IP: ${req.ip || req.connection.remoteAddress}`);
    next();
});

// Configuración desde variables de entorno
const PERSEO_API_KEY = process.env.PERSEO_API_KEY || "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-";
const API_BASE_URL = process.env.API_BASE_URL || "https://accesoalnusan.app/api";

// Configuración de compresión de imágenes (ULTRA OPTIMIZADO PARA VELOCIDAD MÁXIMA)
const MAX_IMAGE_SIZE = 250; // Tamaño mínimo para máxima velocidad (era 300)
const IMAGE_QUALITY = 65; // Calidad mínima aceptable (era 70)
const MAX_CONCURRENT_REQUESTS = 80; // Paralelismo extremo para descargas (era 50)
const MAX_CONCURRENT_COMPRESSION = 50; // Paralelismo extremo para compresión (era 30)
const IMAGE_REQUEST_TIMEOUT = 2000; // Timeout ultra agresivo (era 3s)
const COMPRESSION_EFFORT = 0; // Esfuerzo cero = máxima velocidad posible (era 1)
const SKIP_COMPRESSION_IF_SMALL = true; // Saltar compresión si imagen ya es pequeña
const MIN_IMAGE_SIZE_TO_COMPRESS = 50000; // Solo comprimir si imagen > 50KB

// Limitadores de concurrencia
// Más peticiones simultáneas = más rápido (hasta el límite del servidor)
const limitadorImagenes = pLimit(MAX_CONCURRENT_REQUESTS);
const limitadorCompresion = pLimit(MAX_CONCURRENT_COMPRESSION);

// Configuración de caché (TTL en segundos)
const CACHE_TTL_CATEGORIAS = 30 * 60; // 30 minutos para categorías
const CACHE_TTL_PRODUCTOS = 15 * 60;  // 15 minutos para productos

// Instancias de caché
const cacheCategorias = new NodeCache({ stdTTL: CACHE_TTL_CATEGORIAS });
const cacheProductos = new NodeCache({ stdTTL: CACHE_TTL_PRODUCTOS });

/**
 * Endpoint: localhost:3001/api/categorias/list
 * Objetivo: Lista simplificada de categorías para exponer (solo ID y nombre, sin imágenes)
 * Ideal para dropdowns, menús, etc.
 */
app.get('/api/categorias/list', async (req, res) => {
    const cacheKey = 'categorias_list_simple';
    
    // Verificar caché primero
    const cachedData = cacheCategorias.get(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        // Consultar a Perseo
        const urlCategorias = `${API_BASE_URL}/productos_categorias_consulta`;
        console.log(`\n📡 PETICIÓN INTERNA: Consulta de categorías`);
        console.log(`   🔗 URL: ${urlCategorias}`);
        console.log(`   📍 Origen: GET /api/categorias/list`);
        console.log(`   ⏱️  Iniciando petición...`);
        
        const inicioConsulta = Date.now();
        const response = await axios.post(urlCategorias, {
            "api_key": PERSEO_API_KEY,
            "descripcion": ""
        });
        
        const tiempoConsulta = ((Date.now() - inicioConsulta) / 1000).toFixed(2);
        console.log(`   ✅ Respuesta recibida en ${tiempoConsulta}s`);
        console.log(`   📊 Status: ${response.status}`);
        console.log(`   📦 Categorías encontradas: ${response.data?.categorias?.length || 0}`);

        if (response.data && response.data.categorias) {
            // Formato simplificado: solo ID y nombre
            const categoriasSimplificadas = response.data.categorias.map(cat => ({
                id: cat.productos_categoriasid,
                nombre: cat.descripcion
            }));

            const resultado = {
                success: true,
                total: categoriasSimplificadas.length,
                categorias: categoriasSimplificadas
            };
            
            // Guardar en caché
            cacheCategorias.set(cacheKey, resultado);
            
            res.json(resultado);
        } else {
            res.status(404).json({
                success: false,
                message: "No se encontraron categorías."
            });
        }

    } catch (error) {
        console.error("Error al obtener categorías:", error.message);
        res.status(500).json({
            success: false,
            message: "Error al obtener las categorías."
        });
    }
});

/**
 * Endpoint: localhost:3001/api/categorias
 * Objetivo: Consultar todas las categorías de Perseo y devolverlas al cliente.
 * Optimización: Usa caché para respuestas ultra rápidas en peticiones repetidas.
 */
app.get('/api/categorias', async (req, res) => {
    const cacheKey = 'categorias_all';
    
    // 1. Verificar caché primero (respuesta instantánea)
    const cachedData = cacheCategorias.get(cacheKey);
    if (cachedData) {
        console.log('✅ Categorías servidas desde caché');
        return res.json(cachedData);
    }

    try {
        // 2. Si no hay caché, consultar a Perseo
        const urlCategorias = `${API_BASE_URL}/productos_categorias_consulta`;
        console.log(`\n📡 PETICIÓN INTERNA: Consulta de categorías`);
        console.log(`   🔗 URL: ${urlCategorias}`);
        console.log(`   📍 Origen: GET /api/categorias`);
        console.log(`   ⏱️  Iniciando petición...`);
        
        const inicioConsulta = Date.now();
        const response = await axios.post(urlCategorias, {
            "api_key": PERSEO_API_KEY,
            "descripcion": "" // Vacío para que traiga todas las categorías
        });
        
        const tiempoConsulta = ((Date.now() - inicioConsulta) / 1000).toFixed(2);
        console.log(`   ✅ Respuesta recibida en ${tiempoConsulta}s`);
        console.log(`   📊 Status: ${response.status}`);
        console.log(`   📦 Categorías encontradas: ${response.data?.categorias?.length || 0}`);

        // Verificamos si Perseo respondió con datos
        if (response.data && response.data.categorias) {
            const resultado = {
                success: true,
                data: response.data.categorias
            };
            
            // 3. Guardar en caché para próximas peticiones
            cacheCategorias.set(cacheKey, resultado);
            console.log('💾 Categorías guardadas en caché');
            
            res.json(resultado);
        } else {
            res.status(404).json({
                success: false,
                message: "No se encontraron categorías en Perseo."
            });
        }

    } catch (error) {
        console.error("Error técnico:", error.message);
        if (error.response) {
            // Error de respuesta de la API
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            res.status(error.response.status || 500).json({
                success: false,
                message: "Error al conectar con el servidor de Perseo.",
                error: error.response.data
            });
        } else if (error.request) {
            // Error de red
            console.error("No se recibió respuesta del servidor");
            res.status(503).json({
                success: false,
                message: "No se pudo conectar con el servidor de Perseo."
            });
        } else {
            // Otro tipo de error (sintaxis, lógica, etc.)
            console.error("Error completo:", error);
            console.error("Stack:", error.stack);
        res.status(500).json({
            success: false,
                message: "Error al procesar la solicitud.",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                type: error.name || 'UnknownError'
            });
        }
    }
});

/**
 * Función helper para procesar y comprimir una imagen (ULTRA OPTIMIZADA)
 * Estrategias: Skip si ya es pequeña, compresión mínima, procesamiento rápido
 */
async function procesarImagen(imagenBase64) {
    if (!imagenBase64) return null;

    try {
        // ESTRATEGIA 1: Si la imagen ya es pequeña, devolverla sin comprimir
        if (SKIP_COMPRESSION_IF_SMALL && imagenBase64.length < MIN_IMAGE_SIZE_TO_COMPRESS) {
            return imagenBase64; // Ya es pequeña, no comprimir
        }

        // Convertimos el Base64 a Buffer
        const bufferOriginal = Buffer.from(imagenBase64, 'base64');

        // ESTRATEGIA 2: Compresión ultra rápida con configuración mínima
        const bufferComprimido = await sharp(bufferOriginal, {
            failOnError: false,
            limitInputPixels: 268402689,
            sequentialRead: false,
            animated: false,
            pages: 1 // Solo primera página
        })
            .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, { 
                fit: 'inside',
                withoutEnlargement: true,
                fastShrinkOnLoad: true,
                kernel: 'nearest' // Kernel más rápido que lanczos3
            })
            .webp({ 
                quality: IMAGE_QUALITY,
                effort: COMPRESSION_EFFORT, // Esfuerzo cero = máxima velocidad
                smartSubsample: false, // Desactivado para velocidad
                nearLossless: false,
                alphaQuality: 0,
                lossless: false
            })
            .toBuffer({ resolveWithObject: false });

        return bufferComprimido.toString('base64');
    } catch (error) {
        // Si falla, devolver original en lugar de null (más rápido)
        return imagenBase64;
    }
}


/**
 * Función helper para buscar el ID de una categoría por nombre
 * Si no se encuentra, retorna null
 */
async function buscarCategoriaPorNombre(nombreCategoria) {
    const cacheKey = 'categorias_all';
    
    // Intentar obtener desde caché primero
    let categorias = cacheCategorias.get(cacheKey);
    
    if (!categorias || !categorias.data) {
        // Si no hay en caché, consultar a Perseo
        try {
            const response = await axios.post(`${API_BASE_URL}/productos_categorias_consulta`, {
                "api_key": PERSEO_API_KEY,
                "descripcion": ""
            });
            
            if (response.data && response.data.categorias) {
                categorias = {
                    success: true,
                    data: response.data.categorias
                };
                // Guardar en caché
                cacheCategorias.set(cacheKey, categorias);
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error al buscar categorías:", error.message);
            return null;
        }
    }
    
    // Buscar categoría por nombre (case-insensitive)
    const nombreNormalizado = nombreCategoria.toLowerCase().trim();
    const categoriaEncontrada = categorias.data.find(cat => 
        cat.descripcion && cat.descripcion.toLowerCase().trim() === nombreNormalizado
    );
    
    return categoriaEncontrada ? categoriaEncontrada.categoriasid : null;
}

/**
 * Función lógica para agrupar por código padre (OPTIMIZADA PARA VELOCIDAD)
 * Usa técnicas de optimización: pre-allocación, indexOf más rápido que split
 */
function agruparProductos(lista) {
    const mapaPadres = {};
    const resultados = [];

    // Optimización: pre-calcular códigos padre para evitar múltiples operaciones
    for (let i = 0; i < lista.length; i++) {
        const item = lista[i];
        const codigoOriginal = item.productocodigo || "";
        
        // Optimización: indexOf es más rápido que split para encontrar el guion
        const indiceGuion = codigoOriginal.indexOf('-');
        const codigoPadre = indiceGuion > 0 
            ? codigoOriginal.substring(0, indiceGuion)
            : codigoOriginal;

        let grupo = mapaPadres[codigoPadre];
        
        if (!grupo) {
            grupo = {
                codigo_padre: codigoPadre,
                tiene_variantes: false,
                variantes: []
            };
            mapaPadres[codigoPadre] = grupo;
            resultados.push(grupo); // Mantener orden de inserción
        }

        grupo.variantes.push(item);
        
        // Optimización: solo marcar una vez cuando llega el segundo
        if (grupo.variantes.length === 2) {
            grupo.tiene_variantes = true;
        }
    }

    return resultados;
}

/**
 * Endpoint: localhost:3001/api/productos/:id
 * Objetivo: Traer productos, sus imágenes en paralelo y agrupar por código padre.
 * 
 * Acepta tanto ID numérico como nombre de categoría:
 * - GET /api/productos/126 (por ID)
 * - GET /api/productos/VARIEDADES (por nombre - busca el ID internamente)
 * 
 * Optimizaciones aplicadas:
 * - Paralelismo masivo con límite (p-limit: 10 simultáneas)
 * - Compresión WebP al vuelo (400px, calidad 80%)
 * - Agrupación lógica en memoria (por código padre)
 * - Caché de resultados (15 minutos TTL)
 * - Separación de carga: primero datos ligeros, luego binarios en paralelo
 * - Seguridad: api_key de Perseo nunca sale del servidor
 */
app.get('/api/productos/:id', async (req, res) => {
    const categoriaParam = req.params.id;
    let categoriaIdNum = null;

    // 1. ENTRADA: Detectar si es ID numérico o nombre de categoría
    const categoriaIdParseado = parseInt(categoriaParam);
    
    if (!isNaN(categoriaIdParseado) && categoriaIdParseado > 0) {
        // Es un ID numérico
        categoriaIdNum = categoriaIdParseado;
    } else {
        // Es un nombre, buscar el ID internamente
        console.log(`🔍 Buscando categoría por nombre: "${categoriaParam}"`);
        categoriaIdNum = await buscarCategoriaPorNombre(categoriaParam);
        
        if (!categoriaIdNum) {
            return res.status(404).json({
                success: false,
                message: `No se encontró la categoría "${categoriaParam}". Verifica que el nombre sea correcto.`
            });
        }
        
        console.log(`✅ Categoría "${categoriaParam}" encontrada con ID: ${categoriaIdNum}`);
    }

    const cacheKey = `productos_categoria_${categoriaIdNum}`;
    
    // 1. Verificar caché primero (respuesta instantánea)
    const cachedData = cacheProductos.get(cacheKey);
    if (cachedData) {
        console.log(`✅ Productos de categoría ${categoriaIdNum} servidos desde caché`);
        return res.json(cachedData);
    }

    try {
        console.log(`🔄 Procesando productos de categoría ${categoriaIdNum}...`);
        const inicioTiempo = Date.now();

        // Validar configuración antes de continuar
        if (!PERSEO_API_KEY || !API_BASE_URL) {
            throw new Error("Configuración incompleta: PERSEO_API_KEY o API_BASE_URL no están definidos");
        }

        // 2. PROCESO INTERNO: Consulta base - Obtener lista técnica de productos (JSON ligero)
        // Filtramos solo por esa categoría para no saturar el canal
        const urlProductos = `${API_BASE_URL}/productos_consulta`;
        console.log(`\n📡 PETICIÓN INTERNA #1: Consulta de productos`);
        console.log(`   🔗 URL: ${urlProductos}`);
        console.log(`   📍 Origen: GET /api/productos/${categoriaIdNum}`);
        console.log(`   📦 Parámetros: categoriasid=${categoriaIdNum}`);
        console.log(`   ⏱️  Iniciando petición...`);
        
        const inicioConsultaProductos = Date.now();
        const resPerseo = await axios.post(urlProductos, {
            "api_key": PERSEO_API_KEY,
            "categoriasid": categoriaIdNum,
            "usuario_creacion": "ADMIN",
            "dispositivo": "API"
        }, {
            timeout: 30000, // 30 segundos para la consulta inicial
            validateStatus: (status) => status < 500
        });
        
        const tiempoConsultaProductos = ((Date.now() - inicioConsultaProductos) / 1000).toFixed(2);
        console.log(`   ✅ Respuesta recibida en ${tiempoConsultaProductos}s`);
        console.log(`   📊 Status: ${resPerseo.status}`);
        console.log(`   📦 Productos encontrados: ${resPerseo.data?.productos?.length || 0}`);

        // Validar respuesta de Perseo
        if (!resPerseo.data) {
            throw new Error("La respuesta de Perseo no contiene datos");
        }

        const productosRaw = resPerseo.data?.productos || [];

        // Verificar si hay productos
        if (productosRaw.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron productos en esta categoría."
            });
        }

        // Log de diagnóstico: mostrar estructura del primer producto
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
            
            // Resumen inicial: IDs y códigos
            const productosConId = productosRaw.filter(prod => 
                prod.productosid || prod.productoid || prod.id
            );
            const productosSinId = productosRaw.length - productosConId.length;
            
            const productosIds = productosRaw.map(prod => 
                prod.productosid || prod.productoid || prod.id || 'SIN_ID'
            );
            
            // Contar códigos padre únicos (antes de agrupar)
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

        // 3. PROCESO INTERNO: Estrategia de dos fases para máxima velocidad
        // FASE 1: Obtener todas las imágenes en paralelo (sin comprimir)
        // FASE 2: Comprimir todas las imágenes en paralelo
        // Esto es más rápido que comprimir una por una después de obtenerla
        
        const urlImagen = `${API_BASE_URL}/productos_imagenes_consulta`;
        const inicioDescarga = Date.now();
        
        // FASE 1: Descargar todas las imágenes en paralelo (máximo 50 simultáneas)
        console.log(`\n📡 PETICIÓN INTERNA #2: Consulta de imágenes (${productosRaw.length} productos)`);
        console.log(`   🔗 URL: ${urlImagen}`);
        console.log(`   📍 Origen: GET /api/productos/${categoriaIdNum} (hidratación de imágenes)`);
        console.log(`   🚀 Iniciando ${productosRaw.length} peticiones en paralelo (máx ${MAX_CONCURRENT_REQUESTS} simultáneas)...`);
        
        let contadorPeticiones = 0;
        let contadorExitosas = 0;
        let contadorFallidas = 0;
        
        const productosConImagenRaw = await Promise.all(
            productosRaw.map((prod, index) => 
                limitadorImagenes(async () => {
                    try {
                        const productoId = prod.productosid || prod.productoid || prod.id;
                        
                        if (!productoId) {
                            contadorPeticiones++;
                            console.log(`   ⚠️  [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId || 'SIN_ID'} - Sin ID, omitiendo`);
                            return { producto: prod, imagenBase64: null, productoId: null };
                        }

                        contadorPeticiones++;
                        const inicioPeticion = Date.now();
                        
                        // ESTRATEGIA: Axios con configuración optimizada
                        const resImg = await axios.post(urlImagen, {
                            "api_key": PERSEO_API_KEY,
                            "productosid": productoId
                        }, {
                            timeout: IMAGE_REQUEST_TIMEOUT,
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            validateStatus: (status) => status < 500, // Aceptar más códigos
                            httpAgent: false, // Desactivar agent para velocidad
                            httpsAgent: false
                        });
                        
                        const tiempoPeticion = ((Date.now() - inicioPeticion) / 1000).toFixed(2);
                        const tieneImagen = resImg.data?.informacion === true && 
                                          resImg.data?.productos_imagenes?.[0]?.imagen;
                        
                        if (tieneImagen) {
                            contadorExitosas++;
                            console.log(`   ✅ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Imagen obtenida (${tiempoPeticion}s)`);
                        } else {
                            contadorFallidas++;
                            console.log(`   ❌ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Sin imagen (${tiempoPeticion}s)`);
                        }

                        // Estructura real de Perseo: productos_imagenes es un array
                        // Si informacion: false, no hay imagen
                        // Si informacion: true, la imagen está en productos_imagenes[0].imagen
                        let imagenBase64 = null;
                        
                        // Verificar primero si hay información (informacion: true)
                        if (resImg.data?.informacion === true) {
                            if (resImg.data?.productos_imagenes && 
                                Array.isArray(resImg.data.productos_imagenes) && 
                                resImg.data.productos_imagenes.length > 0) {
                                // Tomar la primera imagen del array
                                imagenBase64 = resImg.data.productos_imagenes[0].imagen;
                            }
                        } else if (resImg.data?.informacion === false) {
                            // No hay imagen disponible
                            imagenBase64 = null;
                        } else {
                            // Fallback: buscar en otras posibles estructuras
                            imagenBase64 = resImg.data?.imagen || 
                                         resImg.data?.data?.imagen || 
                                         resImg.data?.imagen_data;
                        }

                        return { 
                            producto: prod, 
                            imagenBase64: imagenBase64 || null, 
                            productoId: productoId 
                        };
                    } catch (err) {
                        contadorFallidas++;
                        console.log(`   ⚠️  [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Error: ${err.message || 'Error desconocido'}`);
                        
                        // Si falla la consulta, intentar una vez más antes de devolver null
                        // Esto asegura que las variantes tengan su imagen
                        try {
                            console.log(`   🔄 [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Reintentando...`);
                            const resImgRetry = await axios.post(urlImagen, {
                                "api_key": PERSEO_API_KEY,
                                "productosid": productoId
                            }, {
                                timeout: IMAGE_REQUEST_TIMEOUT
                            });
                            
                            if (resImgRetry.data?.informacion === true && 
                                resImgRetry.data?.productos_imagenes?.[0]?.imagen) {
                                contadorExitosas++;
                                contadorFallidas--;
                                console.log(`   ✅ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Imagen obtenida en retry`);
                                return { 
                                    producto: prod, 
                                    imagenBase64: resImgRetry.data.productos_imagenes[0].imagen, 
                                    productoId: productoId 
                                };
                            }
                        } catch (retryErr) {
                            // Si el retry también falla, devolver null
                            console.log(`   ❌ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Retry falló: ${retryErr.message || 'Error desconocido'}`);
                        }
                        
                        return { producto: prod, imagenBase64: null, productoId: productoId };
                    }
                })
            )
        );
        
        const tiempoDescarga = ((Date.now() - inicioDescarga) / 1000).toFixed(2);
        const imagenesDescargadas = productosConImagenRaw.filter(p => p.imagenBase64 !== null).length;
        console.log(`\n📥 RESUMEN DE PETICIONES DE IMÁGENES:`);
        console.log(`   ⏱️  Tiempo total: ${tiempoDescarga}s`);
        console.log(`   ✅ Exitosas: ${contadorExitosas}/${productosRaw.length}`);
        console.log(`   ❌ Fallidas: ${contadorFallidas}/${productosRaw.length}`);
        console.log(`   📊 Total imágenes obtenidas: ${imagenesDescargadas}/${productosRaw.length}`);

        // FASE 2: Comprimir solo imágenes que lo necesiten (máximo 50 simultáneas)
        const inicioCompresion = Date.now();
        
        // ESTRATEGIA: Filtrar y procesar solo imágenes que necesiten compresión
        const productosConImagen = productosConImagenRaw.filter(item => item.imagenBase64);
        const productosSinImagen = productosConImagenRaw.filter(item => !item.imagenBase64);
        
        // Procesar solo las que tienen imagen en paralelo máximo
        const productosComprimidos = await Promise.all(
            productosConImagen.map((item) => 
                limitadorCompresion(async () => {
                    try {
                        const imagenComprimida = await procesarImagen(item.imagenBase64);
                        return { ...item.producto, imagen_data: imagenComprimida };
                    } catch (err) {
                        // Si falla, usar original
                        return { ...item.producto, imagen_data: item.imagenBase64 };
                    }
                })
            )
        );
        
        // Combinar productos con y sin imagen
        const productosSinImagenMapeados = productosSinImagen.map(item => ({ ...item.producto, imagen_data: null }));
        const productosHidratados = [...productosComprimidos, ...productosSinImagenMapeados];
        
        const tiempoCompresion = ((Date.now() - inicioCompresion) / 1000).toFixed(2);
        console.log(`🗜️  Compresión completada en ${tiempoCompresion}s`);
        
        // ESTRATEGIA: Pre-agrupar productos sin imagen mientras se comprimen (si hay muchos)
        // Esto ahorra tiempo en la agrupación final

        // 4. PROCESO INTERNO: Agrupación lógica en memoria
        // El cliente recibe los productos ya "masticados" y listos para mostrar como modelos con variantes
        // Utiliza el guion (-) en productocodigo para separar raíz del sufijo
        // Reduce objetos principales que el navegador debe renderizar
        const resultadoFinal = agruparProductos(productosHidratados);

        // Resumen completo de imágenes y agrupación
        const imagenesConDatos = productosHidratados.filter(p => p.imagen_data !== null).length;
        const imagenesSinDatos = productosHidratados.length - imagenesConDatos;
        const tiempoTotal = ((Date.now() - inicioTiempo) / 1000).toFixed(2);
        const tiempoAgrupacion = ((Date.now() - inicioCompresion) / 1000).toFixed(2);
        
        // Contar productos con/sin ID en el resultado final
        const productosFinalesConId = productosHidratados.filter(p => 
            p.productosid || p.productoid || p.id
        ).length;
        const productosFinalesSinId = productosHidratados.length - productosFinalesConId;
        
        // Contar grupos con variantes
        const gruposConVariantes = resultadoFinal.filter(g => g.tiene_variantes).length;
        const gruposSinVariantes = resultadoFinal.length - gruposConVariantes;
        
        // Total de variantes en todos los grupos
        const totalVariantes = resultadoFinal.reduce((sum, grupo) => sum + grupo.variantes.length, 0);
        
        console.log(`\n⚡ OPTIMIZACIÓN COMPLETA:`);
        console.log(`   📥 Descarga: ${tiempoDescarga}s`);
        console.log(`   🗜️  Compresión: ${tiempoCompresion}s`);
        console.log(`   📦 Agrupación: ${tiempoAgrupacion}s`);
        console.log(`   ⏱️  TOTAL: ${tiempoTotal}s (antes: ~33s)`);
        
        console.log(`\n📊 RESUMEN FINAL DETALLADO:`);
        console.log(`   📦 Total productos recibidos: ${productosRaw.length}`);
        console.log(`   ✅ Productos CON ID: ${productosFinalesConId}`);
        console.log(`   ❌ Productos SIN ID: ${productosFinalesSinId}`);
        console.log(`   🔑 Total códigos padre (grupos): ${resultadoFinal.length}`);
        console.log(`   🔄 Grupos CON variantes: ${gruposConVariantes}`);
        console.log(`   📌 Grupos SIN variantes: ${gruposSinVariantes}`);
        console.log(`   📋 Total variantes en grupos: ${totalVariantes}`);
        console.log(`   🖼️  Imágenes: ${imagenesConDatos} con datos, ${imagenesSinDatos} sin datos\n`);

        // 5. SALIDA: JSON refactorizado y optimizado
        // Productos organizados por Código Padre, con atributos de control inyectados
        const resultado = {
            success: true,
            categoria_consultada: categoriaIdNum,
            total_grupos: resultadoFinal.length,
            items: resultadoFinal
        };

        // Guardar en caché para próximas peticiones (15 minutos)
        cacheProductos.set(cacheKey, resultado);
        console.log(`💾 Resultado guardado en caché (TTL: ${CACHE_TTL_PRODUCTOS}s)`);

        res.json(resultado);

    } catch (error) {
        console.error("❌ Error en procesamiento de productos:");
        console.error("   Mensaje:", error.message);
        console.error("   Tipo:", error.name);
        console.error("   Stack:", error.stack);
        
        if (error.response) {
            // Error de respuesta de la API
            console.error("   Status HTTP:", error.response.status);
            console.error("   Data:", error.response.data);
            res.status(error.response.status || 500).json({
                success: false,
                message: "Error al conectar con el servidor de Perseo.",
                error: error.response.data,
                status: error.response.status
            });
        } else if (error.request) {
            // Error de red
            console.error("   No se recibió respuesta del servidor");
            res.status(503).json({
                success: false,
                message: "No se pudo conectar con el servidor de Perseo.",
                error: "Timeout o error de red"
            });
        } else {
            // Otro tipo de error (sintaxis, lógica, etc.)
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

/**
 * Endpoint de salud y diagnóstico
 * GET /api/health - Verifica el estado del servidor y configuración
 */
app.get('/api/health', (req, res) => {
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

/**
 * Endpoint opcional: Gestión de caché
 * GET /api/cache/stats - Ver estadísticas del caché
 * DELETE /api/cache/clear - Limpiar todo el caché
 */
app.get('/api/cache/stats', (req, res) => {
    const statsCategorias = cacheCategorias.getStats();
    const statsProductos = cacheProductos.getStats();
    
    res.json({
        success: true,
        categorias: {
            keys: cacheCategorias.keys().length,
            hits: statsCategorias.hits || 0,
            misses: statsCategorias.misses || 0,
            ttl: CACHE_TTL_CATEGORIAS
        },
        productos: {
            keys: cacheProductos.keys().length,
            hits: statsProductos.hits || 0,
            misses: statsProductos.misses || 0,
            ttl: CACHE_TTL_PRODUCTOS
        }
    });
});

app.delete('/api/cache/clear', (req, res) => {
    cacheCategorias.flushAll();
    cacheProductos.flushAll();
    res.json({
        success: true,
        message: "Caché limpiado correctamente"
    });
});

// Iniciamos el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('\n🚀 Servidor intermedio optimizado listo');
    console.log(`📍 URL: http://localhost:${PORT}\n`);
    console.log('📡 Endpoints disponibles:');
    console.log(`   GET  /api/health                  - Estado del servidor y configuración`);
    console.log(`   GET  /api/categorias              - Lista todas las categorías completas (caché: ${CACHE_TTL_CATEGORIAS}s)`);
    console.log(`   GET  /api/categorias/list          - Lista simplificada de categorías (solo ID y nombre)`);
    console.log(`   GET  /api/productos/:id           - Productos por ID (ej: /api/productos/126)`);
    console.log(`   GET  /api/productos/:nombre       - Productos por nombre (ej: /api/productos/VARIEDADES)`);
    console.log(`   GET  /api/cache/stats             - Estadísticas del caché`);
    console.log(`   DELETE /api/cache/clear           - Limpiar caché\n`);
    console.log('⚡ Optimizaciones EXTREMAS de velocidad activas:');
    console.log(`   🚀 Paralelismo extremo (${MAX_CONCURRENT_REQUESTS} descargas, ${MAX_CONCURRENT_COMPRESSION} compresiones simultáneas)`);
    console.log(`   ⚡ Procesamiento optimizado (skip compresión si < ${MIN_IMAGE_SIZE_TO_COMPRESS} bytes)`);
    console.log(`   🗜️  Compresión WebP mínima (${MAX_IMAGE_SIZE}px, calidad ${IMAGE_QUALITY}%, effort ${COMPRESSION_EFFORT})`);
    console.log(`   ⏱️  Timeout ultra agresivo (${IMAGE_REQUEST_TIMEOUT}ms por imagen)`);
    console.log(`   📦 Agrupación optimizada (indexOf + pre-allocación)`);
    console.log(`   💾 Caché en memoria (categorías: ${CACHE_TTL_CATEGORIAS}s, productos: ${CACHE_TTL_PRODUCTOS}s)`);
    console.log(`   🔇 Logs mínimos + procesamiento selectivo\n`);
});