import sharp from 'sharp';
import pLimit from 'p-limit';
import {
    MAX_IMAGE_SIZE,
    IMAGE_QUALITY,
    MAX_CONCURRENT_COMPRESSION,
    COMPRESSION_EFFORT,
    SKIP_COMPRESSION_IF_SMALL,
    MIN_IMAGE_SIZE_TO_COMPRESS
} from '../config/index.js';

// Limitador de concurrencia para compresión
export const limitadorCompresion = pLimit(MAX_CONCURRENT_COMPRESSION);

/**
 * Procesa y comprime una imagen Base64 a WebP optimizado
 * @param {string} imagenBase64 - Imagen en formato Base64
 * @returns {Promise<string>} - Imagen comprimida en Base64
 */
export async function procesarImagen(imagenBase64) {
    if (!imagenBase64) return null;

    try {
        // ESTRATEGIA: Saltar compresión si la imagen ya es pequeña (más rápido)
        if (SKIP_COMPRESSION_IF_SMALL && imagenBase64.length < MIN_IMAGE_SIZE_TO_COMPRESS) {
            return imagenBase64; // Ya es pequeña, no comprimir
        }

        // Convertir Base64 a Buffer
        const bufferOriginal = Buffer.from(imagenBase64, 'base64');

        // COMPRESIÓN ULTRA OPTIMIZADA: Redimensionar y convertir a WebP
        const bufferComprimido = await sharp(bufferOriginal)
            .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
                fit: 'inside',
                withoutEnlargement: true,
                kernel: 'nearest' // Kernel más rápido
            })
            .webp({
                quality: IMAGE_QUALITY,
                effort: COMPRESSION_EFFORT, // Esfuerzo mínimo = máxima velocidad
                alphaQuality: 0, // Sin transparencia para velocidad
                nearLossless: false,
                smartSubsample: false
            })
            .toBuffer({
                resolveWithObject: false
            });

        return bufferComprimido.toString('base64');
    } catch (error) {
        // Si falla, devolver original en lugar de null (más rápido)
        return imagenBase64;
    }
}

/**
 * Procesa múltiples imágenes en un pool global para máxima eficiencia
 * @param {Array} productosConImagenes - Array de productos con sus imágenes
 * @returns {Promise<Array>} - Productos con imágenes comprimidas
 */
export async function procesarTodasLasImagenes(productosConImagenes) {
    const inicioCompresion = Date.now();
    const totalImagenes = productosConImagenes.reduce((sum, p) => sum + (p.imagenesBase64?.length || 0), 0);
    
    console.log(`🗜️  Iniciando compresión de ${totalImagenes} imágenes en pool global (máx ${MAX_CONCURRENT_COMPRESSION} simultáneas)...`);
    
    // ESTRATEGIA OPTIMIZADA: Crear un array plano de todas las imágenes con referencia al producto
    const todasLasImagenes = [];
    productosConImagenes.forEach((item, productoIndex) => {
        if (item.imagenesBase64 && item.imagenesBase64.length > 0) {
            item.imagenesBase64.forEach((imagenBase64, imagenIndex) => {
                todasLasImagenes.push({
                    productoIndex,
                    imagenIndex,
                    imagenBase64,
                    producto: item.producto
                });
            });
        }
    });
    
    // Procesar TODAS las imágenes en paralelo usando el limitador global
    const imagenesComprimidas = await Promise.all(
        todasLasImagenes.map((item) => 
            limitadorCompresion(async () => {
                try {
                    const imagenComprimida = await procesarImagen(item.imagenBase64);
                    return {
                        productoIndex: item.productoIndex,
                        imagenIndex: item.imagenIndex,
                        imagenComprimida
                    };
                } catch (err) {
                    // Si falla, usar original
                    return {
                        productoIndex: item.productoIndex,
                        imagenIndex: item.imagenIndex,
                        imagenComprimida: item.imagenBase64
                    };
                }
            })
        )
    );
    
    // Reconstruir productos con sus imágenes comprimidas
    const productosComprimidos = productosConImagenes.map((item, productoIndex) => {
        if (!item.imagenesBase64 || item.imagenesBase64.length === 0) {
            return { ...item.producto, imagenes_data: [] };
        }
        
        // Obtener todas las imágenes comprimidas de este producto
        const imagenesDelProducto = imagenesComprimidas
            .filter(img => img.productoIndex === productoIndex)
            .sort((a, b) => a.imagenIndex - b.imagenIndex)
            .map(img => img.imagenComprimida);
        
        return { ...item.producto, imagenes_data: imagenesDelProducto };
    });
    
    const tiempoCompresion = ((Date.now() - inicioCompresion) / 1000).toFixed(2);
    const imagenesProcesadas = imagenesComprimidas.length;
    console.log(`🗜️  Compresión completada en ${tiempoCompresion}s`);
    console.log(`   📊 ${imagenesProcesadas} imágenes procesadas en pool global (${(imagenesProcesadas / parseFloat(tiempoCompresion)).toFixed(1)} img/s)`);
    
    return productosComprimidos;
}

