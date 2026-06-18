import dotenv from 'dotenv';

dotenv.config();

export const PERSEO_API_KEY = process.env.PERSEO_API_KEY || "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-";
export const API_BASE_URL = process.env.API_BASE_URL || "https://accesoalnusan.app/api";
export const PORT = process.env.PORT || 3001;

export const API_KEY = process.env.API_KEY || PERSEO_API_KEY;
export const API_SECRET_KEY = process.env.API_SECRET_KEY;

// Compresión agresiva (prioriza poco peso en respuesta / banda en Render)
export const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE, 10) || 120;
export const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY, 10) || 38;
export const COMPRESSION_EFFORT = parseInt(process.env.COMPRESSION_EFFORT, 10) || 6;
export const MAX_OUTPUT_BYTES = parseInt(process.env.MAX_OUTPUT_BYTES, 10) || 18000;
export const IMAGE_EMERGENCY_SIZE = parseInt(process.env.IMAGE_EMERGENCY_SIZE, 10) || 72;
export const IMAGE_EMERGENCY_QUALITY = parseInt(process.env.IMAGE_EMERGENCY_QUALITY, 10) || 28;

export const MAX_CONCURRENT_REQUESTS = parseInt(process.env.MAX_CONCURRENT_REQUESTS, 10) || 100;
export const MAX_CONCURRENT_COMPRESSION = parseInt(process.env.MAX_CONCURRENT_COMPRESSION, 10) || 80;
export const IMAGE_REQUEST_TIMEOUT = parseInt(process.env.IMAGE_REQUEST_TIMEOUT, 10) || 10000;

export const ALMACEN_ID = parseInt(process.env.ALMACEN_ID, 10) || 2;

export const CACHE_TTL_CATEGORIAS = 30 * 60;
export const CACHE_TTL_PRODUCTOS = 15 * 60;
