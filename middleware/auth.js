import { API_KEY } from '../config/index.js';
import { hash } from '../utils/crypto.js';
import crypto from 'crypto';

// Hash de la API key (se calcula una vez al iniciar)
const API_KEY_HASH = hash(API_KEY);

/**
 * Middleware de autenticación con API Key cifrada
 * Valida que el API key esté presente en el body de la petición y sea válido
 */
export function authenticateApiKey(req, res, next) {
    // Obtener el API key del body
    const apiKey = req.body?.api_key || req.body?.apiKey;

    // Verificar si el API key existe
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: "API key requerida. Debe enviar 'api_key' en el body de la petición."
        });
    }

    // Comparar el hash del API key recibido con el hash almacenado (comparación segura)
    try {
        const receivedHash = hash(apiKey);
        
        // Usar comparación segura contra timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(API_KEY_HASH))) {
            return res.status(403).json({
                success: false,
                message: "API key inválida."
            });
        }
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Error al validar la API key."
        });
    }

    // API key válida, continuar
    next();
}
