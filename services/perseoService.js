import axios from 'axios';
import pLimit from 'p-limit';
import {
    PERSEO_API_KEY,
    API_BASE_URL,
    MAX_CONCURRENT_REQUESTS,
    MAX_CONCURRENT_EXISTENCIAS,
    HIDRATACION_BATCH_SIZE,
    IMAGE_REQUEST_TIMEOUT,
    PRODUCTOS_CONSULTA_TIMEOUT
} from '../config/index.js';
import { procesarTodasLasImagenes } from '../utils/imageProcessor.js';

const limitadorImagenes = pLimit(MAX_CONCURRENT_REQUESTS);
const limitadorExistencias = pLimit(MAX_CONCURRENT_EXISTENCIAS);

/**
 * Procesa un array en lotes para limitar pico de memoria (Render 512MB)
 * @template T, R
 * @param {T[]} items
 * @param {number} batchSize
 * @param {(item: T) => Promise<R>} processor
 * @returns {Promise<R[]>}
 */
async function procesarEnLotes(items, batchSize, processor) {
    const resultados = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const lote = items.slice(i, i + batchSize);
        const loteResultados = await Promise.all(lote.map(processor));
        resultados.push(...loteResultados);
    }
    return resultados;
}

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
 * Obtiene todas las subcategorías de productos de Perseo
 * @returns {Promise<Object>} - Respuesta con subcategorias
 */
export async function obtenerSubcategorias() {
    const response = await axios.post(`${API_BASE_URL}/productos_subcategorias_consulta`, {
        "api_key": PERSEO_API_KEY
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
        timeout: PRODUCTOS_CONSULTA_TIMEOUT,
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
 * @param {number} almacenId - ID del almacén (por defecto 2)
 * @returns {Promise<number>} - Cantidad de existencias del almacén configurado (0 si no hay)
 */
export async function obtenerExistenciasProducto(productoId, almacenId = 2) {
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
            // Buscar el almacén especificado
            const almacenEncontrado = resExistencias.data.existencias.find(
                exist => exist.almacenesid === almacenId
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
                    exist => exist.almacenesid === almacenId
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
 * Consulta existencias frescas para varios productos (tiempo casi real)
 * @param {number[]} productosIds
 * @param {number} almacenId
 * @returns {Promise<Map<number, number>>}
 */
export async function obtenerExistenciasPorProductosIds(productosIds, almacenId) {
    const mapa = new Map();

    await Promise.all(
        productosIds.map((productoId) =>
            limitadorExistencias(async () => {
                const cantidad = await obtenerExistenciasProducto(productoId, almacenId);
                mapa.set(productoId, cantidad);
            })
        )
    );

    return mapa;
}

/**
 * Aplica stock fresco sobre grupos (clon, no muta caché)
 * @param {Array<{ variantes: Array<Record<string, unknown>> }>} items
 * @param {number} almacenId
 * @returns {Promise<Array<{ variantes: Array<Record<string, unknown>> }>>}
 */
export async function aplicarExistenciasFrescasEnGrupos(items, almacenId) {
    const ids = new Set();
    for (const grupo of items) {
        for (const variante of grupo.variantes) {
            const productoId = variante.productosid || variante.productoid || variante.id;
            const idNum = typeof productoId === 'number' ? productoId : parseInt(String(productoId), 10);
            if (Number.isFinite(idNum) && idNum > 0) {
                ids.add(idNum);
            }
        }
    }

    if (ids.size === 0) {
        return items;
    }

    const existencias = await obtenerExistenciasPorProductosIds([...ids], almacenId);

    return items.map((grupo) => ({
        ...grupo,
        variantes: grupo.variantes.map((variante) => {
            const productoId = variante.productosid || variante.productoid || variante.id;
            const idNum = typeof productoId === 'number' ? productoId : parseInt(String(productoId), 10);
            return {
                ...variante,
                existenciastotales: Number.isFinite(idNum) ? (existencias.get(idNum) ?? 0) : 0
            };
        })
    }));
}

/**
 * Hidrata productos con imágenes; existencias opcionales (catálogo en caché las omite)
 * @param {Array} productosRaw
 * @param {number} almacenId
 * @param {{ incluirImagenes?: boolean, maxImagenes?: number, omitirExistencias?: boolean }} opciones
 * @returns {Promise<Array>}
 */
export async function hidratarProductosConImagenes(productosRaw, almacenId = 2, opciones = {}) {
    const incluirImagenes = opciones.incluirImagenes !== false;
    const maxImagenes = opciones.maxImagenes ?? 1;
    const omitirExistencias = opciones.omitirExistencias === true;

    const productosConImagenRaw = await procesarEnLotes(
        productosRaw,
        HIDRATACION_BATCH_SIZE,
        (prod) =>
            limitadorImagenes(async () => {
                const productoId = prod.productosid || prod.productoid || prod.id;

                if (!productoId) {
                    return {
                        producto: prod,
                        imagenesBase64: [],
                        existenciastotales: 0,
                        productoId: null
                    };
                }

                try {
                    if (!incluirImagenes) {
                        if (omitirExistencias) {
                            return {
                                producto: prod,
                                imagenesBase64: [],
                                existenciastotales: 0,
                                productoId
                            };
                        }
                        const existencias = await obtenerExistenciasProducto(productoId, almacenId);
                        return {
                            producto: prod,
                            imagenesBase64: [],
                            existenciastotales: existencias,
                            productoId
                        };
                    }

                    const imagenesBase64 = await obtenerImagenesProducto(productoId);
                    const imagenesLimitadas =
                        maxImagenes > 0 ? imagenesBase64.slice(0, maxImagenes) : [];

                    let existencias = 0;
                    if (!omitirExistencias) {
                        existencias = await obtenerExistenciasProducto(productoId, almacenId);
                    }

                    return {
                        producto: prod,
                        imagenesBase64: imagenesLimitadas,
                        existenciastotales: existencias,
                        productoId
                    };
                } catch {
                    return {
                        producto: prod,
                        imagenesBase64: [],
                        existenciastotales: 0,
                        productoId
                    };
                }
            })
    );

    if (!incluirImagenes) {
        return productosConImagenRaw.map((item) => ({
            ...item.producto,
            imagenes_data: [],
            existenciastotales: item.existenciastotales || 0
        }));
    }

    const productosComprimidos = await procesarTodasLasImagenes(productosConImagenRaw);

    return productosComprimidos.map((producto, index) => {
        const productoOriginal = productosConImagenRaw[index];
        return {
            ...producto,
            existenciastotales: productoOriginal?.existenciastotales || 0
        };
    });
}

