import sharp from 'sharp';
import pLimit from 'p-limit';
import {
    MAX_IMAGE_SIZE,
    IMAGE_QUALITY,
    MAX_CONCURRENT_COMPRESSION,
    COMPRESSION_EFFORT,
    MAX_OUTPUT_BYTES,
    IMAGE_EMERGENCY_SIZE,
    IMAGE_EMERGENCY_QUALITY
} from '../config/index.js';

export const limitadorCompresion = pLimit(MAX_CONCURRENT_COMPRESSION);

/**
 * Pipeline WebP orientado a mínimo peso (miniaturas de catálogo)
 * @param {Buffer} bufferOriginal
 * @param {number} maxSide
 * @param {number} quality
 * @returns {Promise<Buffer>}
 */
async function comprimirBuffer(bufferOriginal, maxSide, quality) {
    return sharp(bufferOriginal)
        .rotate()
        .resize(maxSide, maxSide, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .webp({
            quality,
            effort: COMPRESSION_EFFORT,
            alphaQuality: 0,
            nearLossless: false,
            smartSubsample: true
        })
        .toBuffer();
}

/**
 * Comprime Base64 a WebP miniatura; segundo pase si sigue pesada
 * @param {string} imagenBase64
 * @returns {Promise<string|null>}
 */
export async function procesarImagen(imagenBase64) {
    if (!imagenBase64) {
        return null;
    }

    try {
        const bufferOriginal = Buffer.from(imagenBase64, 'base64');
        let bufferComprimido = await comprimirBuffer(bufferOriginal, MAX_IMAGE_SIZE, IMAGE_QUALITY);

        if (bufferComprimido.length > MAX_OUTPUT_BYTES) {
            bufferComprimido = await comprimirBuffer(
                bufferOriginal,
                IMAGE_EMERGENCY_SIZE,
                IMAGE_EMERGENCY_QUALITY
            );
        }

        return bufferComprimido.toString('base64');
    } catch {
        try {
            const bufferOriginal = Buffer.from(imagenBase64, 'base64');
            const bufferEmergencia = await comprimirBuffer(
                bufferOriginal,
                IMAGE_EMERGENCY_SIZE,
                IMAGE_EMERGENCY_QUALITY
            );
            return bufferEmergencia.toString('base64');
        } catch {
            return null;
        }
    }
}

/**
 * @param {Array} productosConImagenes
 * @returns {Promise<Array>}
 */
export async function procesarTodasLasImagenes(productosConImagenes) {
    const todasLasImagenes = [];
    productosConImagenes.forEach((item, productoIndex) => {
        if (item.imagenesBase64?.length > 0) {
            item.imagenesBase64.forEach((imagenBase64, imagenIndex) => {
                todasLasImagenes.push({
                    productoIndex,
                    imagenIndex,
                    imagenBase64
                });
            });
        }
    });

    const imagenesComprimidas = await Promise.all(
        todasLasImagenes.map((item) =>
            limitadorCompresion(async () => {
                const imagenComprimida = await procesarImagen(item.imagenBase64);
                return {
                    productoIndex: item.productoIndex,
                    imagenIndex: item.imagenIndex,
                    imagenComprimida
                };
            })
        )
    );

    return productosConImagenes.map((item, productoIndex) => {
        if (!item.imagenesBase64?.length) {
            return { ...item.producto, imagenes_data: [] };
        }

        const imagenesDelProducto = imagenesComprimidas
            .filter((img) => img.productoIndex === productoIndex && img.imagenComprimida)
            .sort((a, b) => a.imagenIndex - b.imagenIndex)
            .map((img) => img.imagenComprimida);

        return { ...item.producto, imagenes_data: imagenesDelProducto };
    });
}
