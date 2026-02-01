import axios from 'axios';
import pLimit from 'p-limit';
import {
    PERSEO_API_KEY,
    API_BASE_URL,
    MAX_CONCURRENT_REQUESTS,
    IMAGE_REQUEST_TIMEOUT,
    ALMACEN_ID
} from '../config/index.js';
import { procesarTodasLasImagenes } from '../utils/imageProcessor.js';

// Limitador de concurrencia para descargas de imágenes y existencias
const limitadorImagenes = pLimit(MAX_CONCURRENT_REQUESTS);
const limitadorExistencias = pLimit(MAX_CONCURRENT_REQUESTS);

/**
 * Obtiene todas las categorías de Perseo
 * @returns {Promise<Object>} - Respuesta con categorías
 */
export async function obtenerCategorias() {
    const response = await axios.post(`${API_BASE_URL}/productos_categorias_consulta`, {
        "api_key": PERSEO_API_KEY,
        "descripcion": ""
    });
    
    return response.data;
}

/**
 * Obtiene productos de una categoría específica
 * @param {number} categoriaId - ID de la categoría
 * @returns {Promise<Object>} - Respuesta con productos
 */
export async function obtenerProductosPorCategoria(categoriaId) {
    const response = await axios.post(`${API_BASE_URL}/productos_consulta`, {
        "api_key": PERSEO_API_KEY,
        "categoriasid": categoriaId,
        "usuario_creacion": "ADMIN",
        "dispositivo": "API"
    }, {
        timeout: 30000,
        validateStatus: (status) => status < 500
    });
    
    return response.data;
}

/**
 * Obtiene las imágenes de un producto específico
 * @param {number} productoId - ID del producto
 * @returns {Promise<Array>} - Array de imágenes en Base64
 */
async function obtenerImagenesProducto(productoId) {
    const urlImagen = `${API_BASE_URL}/productos_imagenes_consulta`;
    
    try {
        const resImg = await axios.post(urlImagen, {
            "api_key": PERSEO_API_KEY,
            "productosid": productoId
        }, {
            timeout: IMAGE_REQUEST_TIMEOUT,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (status) => status < 500,
            httpAgent: false,
            httpsAgent: false
        });
        
        // Verificar si hay información (informacion: true)
        if (resImg.data?.informacion === true) {
            if (resImg.data?.productos_imagenes && 
                Array.isArray(resImg.data.productos_imagenes) && 
                resImg.data.productos_imagenes.length > 0) {
                // Tomar TODAS las imágenes del array
                return resImg.data.productos_imagenes
                    .map(img => img.imagen)
                    .filter(img => img);
            }
        }
        
        return [];
    } catch (err) {
        // Si falla, intentar retry una vez
        try {
            const resImgRetry = await axios.post(urlImagen, {
                "api_key": PERSEO_API_KEY,
                "productosid": productoId
            }, {
                timeout: IMAGE_REQUEST_TIMEOUT * 2,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                validateStatus: (status) => status < 500,
                httpAgent: false,
                httpsAgent: false
            });
            
            if (resImgRetry.data?.informacion === true && 
                resImgRetry.data?.productos_imagenes && 
                Array.isArray(resImgRetry.data.productos_imagenes) &&
                resImgRetry.data.productos_imagenes.length > 0) {
                return resImgRetry.data.productos_imagenes
                    .map(img => img.imagen)
                    .filter(img => img);
            }
        } catch (retryErr) {
            // Si el retry también falla, devolver array vacío
        }
        
        return [];
    }
}

/**
 * Obtiene las existencias de un producto específico del almacén configurado
 * @param {number} productoId - ID del producto
 * @returns {Promise<number>} - Cantidad de existencias del almacén configurado (0 si no hay)
 */
async function obtenerExistenciasProducto(productoId) {
    const urlExistencias = `${API_BASE_URL}/existencia_producto`;
    
    try {
        const resExistencias = await axios.post(urlExistencias, {
            "api_key": PERSEO_API_KEY,
            "productosid": productoId
        }, {
            timeout: IMAGE_REQUEST_TIMEOUT,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (status) => status < 500,
            httpAgent: false,
            httpsAgent: false
        });
        
        // Verificar si hay existencias
        if (resExistencias.data?.existencias && Array.isArray(resExistencias.data.existencias)) {
            // Buscar el almacén configurado (ALMACEN_ID)
            const almacenEncontrado = resExistencias.data.existencias.find(
                exist => exist.almacenesid === ALMACEN_ID
            );
            
            if (almacenEncontrado) {
                return almacenEncontrado.existencias || 0;
            }
        }
        
        return 0;
    } catch (err) {
        // Si falla, intentar retry una vez
        try {
            const resExistenciasRetry = await axios.post(urlExistencias, {
                "api_key": PERSEO_API_KEY,
                "productosid": productoId
            }, {
                timeout: IMAGE_REQUEST_TIMEOUT * 2,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                validateStatus: (status) => status < 500,
                httpAgent: false,
                httpsAgent: false
            });
            
            if (resExistenciasRetry.data?.existencias && Array.isArray(resExistenciasRetry.data.existencias)) {
                const almacenEncontrado = resExistenciasRetry.data.existencias.find(
                    exist => exist.almacenesid === ALMACEN_ID
                );
                
                if (almacenEncontrado) {
                    return almacenEncontrado.existencias || 0;
                }
            }
        } catch (retryErr) {
            // Si el retry también falla, devolver 0
        }
        
        return 0;
    }
}

/**
 * Hidrata productos con sus imágenes y existencias en paralelo
 * @param {Array} productosRaw - Array de productos sin imágenes ni existencias
 * @returns {Promise<Array>} - Productos con imágenes comprimidas y existencias
 */
export async function hidratarProductosConImagenes(productosRaw) {
    const urlImagen = `${API_BASE_URL}/productos_imagenes_consulta`;
    const inicioDescarga = Date.now();
    
    let contadorPeticiones = 0;
    let contadorExitosas = 0;
    let contadorFallidas = 0;
    
    console.log(`\n📡 PETICIÓN INTERNA #2: Consulta de imágenes y existencias (${productosRaw.length} productos)`);
    console.log(`   🔗 URL Imágenes: ${urlImagen}`);
    console.log(`   🔗 URL Existencias: ${API_BASE_URL}/existencia_producto`);
    console.log(`   📍 Origen: Hidratación de imágenes y existencias`);
    console.log(`   🏪 Almacén configurado: ID ${ALMACEN_ID}`);
    console.log(`   🚀 Iniciando ${productosRaw.length * 2} peticiones en paralelo (máx ${MAX_CONCURRENT_REQUESTS} simultáneas)...`);
    
    // FASE 1: Descargar todas las imágenes Y existencias en paralelo (ambas al mismo tiempo)
    const productosConImagenRaw = await Promise.all(
        productosRaw.map((prod) => 
            limitadorImagenes(async () => {
                // Definir productoId ANTES del try para que esté disponible en el catch
                const productoId = prod.productosid || prod.productoid || prod.id;
                
                try {
                    if (!productoId) {
                        contadorPeticiones++;
                        console.log(`   ⚠️  [${contadorPeticiones}/${productosRaw.length}] productosid=SIN_ID - Sin ID, omitiendo`);
                        return { 
                            producto: prod, 
                            imagenesBase64: [], 
                            existenciastotales: 0,
                            productoId: null 
                        };
                    }

                    contadorPeticiones++;
                    const inicioPeticion = Date.now();
                    
                    // Hacer ambas peticiones en paralelo (imágenes y existencias al mismo tiempo)
                    const [imagenesBase64, existencias] = await Promise.all([
                        obtenerImagenesProducto(productoId),
                        obtenerExistenciasProducto(productoId)
                    ]);
                    
                    const tiempoPeticion = ((Date.now() - inicioPeticion) / 1000).toFixed(2);
                    
                    if (imagenesBase64.length > 0) {
                        contadorExitosas++;
                        if (imagenesBase64.length > 1) {
                            console.log(`   📸 [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - ${imagenesBase64.length} imágenes, ${existencias} existencias (${tiempoPeticion}s)`);
                        } else {
                            console.log(`   ✅ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - ${imagenesBase64.length} imagen, ${existencias} existencias (${tiempoPeticion}s)`);
                        }
                    } else {
                        contadorFallidas++;
                        console.log(`   ❌ [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId} - Sin imagen, ${existencias} existencias (${tiempoPeticion}s)`);
                    }

                    return { 
                        producto: prod, 
                        imagenesBase64: imagenesBase64, 
                        existenciastotales: existencias,
                        productoId: productoId 
                    };
                } catch (err) {
                    contadorFallidas++;
                    console.log(`   ⚠️  [${contadorPeticiones}/${productosRaw.length}] productosid=${productoId || 'SIN_ID'} - Error: ${err.message || 'Error desconocido'}`);
                    return { 
                        producto: prod, 
                        imagenesBase64: [], 
                        existenciastotales: 0,
                        productoId: productoId || null 
                    };
                }
            })
        )
    );
    
    const tiempoDescarga = ((Date.now() - inicioDescarga) / 1000).toFixed(2);
    const totalImagenesDescargadas = productosConImagenRaw.reduce((sum, p) => sum + (p.imagenesBase64?.length || 0), 0);
    const productosConImagenes = productosConImagenRaw.filter(p => p.imagenesBase64 && p.imagenesBase64.length > 0);
    const totalExistencias = productosConImagenRaw.reduce((sum, p) => sum + (p.existenciastotales || 0), 0);
    const productosConExistencias = productosConImagenRaw.filter(p => (p.existenciastotales || 0) > 0).length;
    
    console.log(`\n📥 RESUMEN DE PETICIONES DE IMÁGENES Y EXISTENCIAS:`);
    console.log(`   ⏱️  Tiempo total: ${tiempoDescarga}s`);
    console.log(`   ✅ Exitosas: ${contadorExitosas}/${productosRaw.length}`);
    console.log(`   ❌ Fallidas: ${contadorFallidas}/${productosRaw.length}`);
    console.log(`   📊 Total productos con imágenes: ${productosConImagenes.length}/${productosRaw.length}`);
    console.log(`   🖼️  Total imágenes descargadas: ${totalImagenesDescargadas}`);
    console.log(`   📦 Productos con existencias (almacén ${ALMACEN_ID}): ${productosConExistencias}/${productosRaw.length}`);
    console.log(`   📊 Total existencias: ${totalExistencias}`);
    
    // FASE 2: Comprimir todas las imágenes
    const productosComprimidos = await procesarTodasLasImagenes(productosConImagenRaw);
    
    // Agregar existenciastotales a cada producto después de la compresión
    const productosFinales = productosComprimidos.map((producto, index) => {
        const productoOriginal = productosConImagenRaw[index];
        return {
            ...producto,
            existenciastotales: productoOriginal?.existenciastotales || 0
        };
    });
    
    return productosFinales;
}

