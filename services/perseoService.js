import axios from 'axios';
import pLimit from 'p-limit';
import {
    PERSEO_API_KEY,
    API_BASE_URL,
    MAX_CONCURRENT_EXISTENCIAS,
    EXISTENCIAS_BATCH_SIZE,
    IMAGE_REQUEST_TIMEOUT,
    PRODUCTOS_CONSULTA_TIMEOUT
} from '../config/index.js';
import { obtenerImagenesComprimidas } from './imagenProductoService.js';

const limitadorExistencias = pLimit(MAX_CONCURRENT_EXISTENCIAS);

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

    for (let i = 0; i < productosIds.length; i += EXISTENCIAS_BATCH_SIZE) {
        const lote = productosIds.slice(i, i + EXISTENCIAS_BATCH_SIZE);
        await Promise.all(
            lote.map((productoId) =>
                limitadorExistencias(async () => {
                    const cantidad = await obtenerExistenciasProducto(productoId, almacenId);
                    mapa.set(productoId, cantidad);
                })
            )
        );
    }

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
 * Hidrata productos con imágenes (secuencial, bajo pico de memoria); existencias opcionales
 * @param {Array} productosRaw
 * @param {number} almacenId
 * @param {{ incluirImagenes?: boolean, maxImagenes?: number, omitirExistencias?: boolean }} opciones
 * @param {import('node-cache')|null} [cacheImagenes]
 * @returns {Promise<Array>}
 */
export async function hidratarProductosConImagenes(productosRaw, almacenId = 2, opciones = {}, cacheImagenes = null) {
    const incluirImagenes = opciones.incluirImagenes !== false;
    const maxImagenes = opciones.maxImagenes ?? 1;
    const omitirExistencias = opciones.omitirExistencias === true;
    const resultados = [];

    for (const prod of productosRaw) {
        const productoId = prod.productosid || prod.productoid || prod.id;

        if (!productoId) {
            resultados.push({
                ...prod,
                imagenes_data: [],
                existenciastotales: 0
            });
            continue;
        }

        try {
            if (!incluirImagenes) {
                let existencias = 0;
                if (!omitirExistencias) {
                    existencias = await obtenerExistenciasProducto(productoId, almacenId);
                }
                resultados.push({
                    ...prod,
                    imagenes_data: [],
                    existenciastotales: existencias
                });
                continue;
            }

            const imagenes_data = await obtenerImagenesComprimidas(productoId, maxImagenes, cacheImagenes);

            let existencias = 0;
            if (!omitirExistencias) {
                existencias = await obtenerExistenciasProducto(productoId, almacenId);
            }

            resultados.push({
                ...prod,
                imagenes_data,
                existenciastotales: existencias
            });
        } catch {
            resultados.push({
                ...prod,
                imagenes_data: [],
                existenciastotales: 0
            });
        }
    }

    return resultados;
}

