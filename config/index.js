import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de API
export const PERSEO_API_KEY = process.env.PERSEO_API_KEY || "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-";
export const API_BASE_URL = process.env.API_BASE_URL || "https://accesoalnusan.app/api";
export const PORT = process.env.PORT || 3001;

// Configuración de compresión de imágenes (ULTRA OPTIMIZADO PARA VELOCIDAD MÁXIMA)
export const MAX_IMAGE_SIZE = 250; // Tamaño mínimo para máxima velocidad
export const IMAGE_QUALITY = 65; // Calidad mínima aceptable
export const MAX_CONCURRENT_REQUESTS = 100; // Paralelismo extremo para descargas
export const MAX_CONCURRENT_COMPRESSION = 150; // Paralelismo extremo para compresión
export const IMAGE_REQUEST_TIMEOUT = parseInt(process.env.IMAGE_REQUEST_TIMEOUT) || 10000; // Timeout de 10s
export const COMPRESSION_EFFORT = 0; // Esfuerzo cero = máxima velocidad posible
export const SKIP_COMPRESSION_IF_SMALL = true; // Saltar compresión si imagen ya es pequeña
export const MIN_IMAGE_SIZE_TO_COMPRESS = 50000; // Solo comprimir si imagen > 50KB

// Configuración de almacén
export const ALMACEN_ID = parseInt(process.env.ALMACEN_ID) || 2; // ID del almacén por defecto (2 = CEDI PROMOCIONAL)

// Configuración de caché (TTL en segundos)
export const CACHE_TTL_CATEGORIAS = 30 * 60; // 30 minutos para categorías
export const CACHE_TTL_PRODUCTOS = 15 * 60;  // 15 minutos para productos

