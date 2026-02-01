import crypto from 'crypto';

// Clave secreta para cifrar/descifrar (debe estar en variables de entorno)
const SECRET_KEY = process.env.API_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Cifra un texto usando AES-256-GCM
 * @param {string} text - Texto a cifrar
 * @returns {string} - Texto cifrado en formato base64
 */
export function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Combinar IV + authTag + texto cifrado
        const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        
        return Buffer.from(combined).toString('base64');
    } catch (error) {
        console.error('Error al cifrar:', error);
        throw new Error('Error al cifrar la API key');
    }
}

/**
 * Descifra un texto cifrado usando AES-256-GCM
 * @param {string} encryptedText - Texto cifrado en formato base64
 * @returns {string} - Texto descifrado
 */
export function decrypt(encryptedText) {
    try {
        const combined = Buffer.from(encryptedText, 'base64').toString('hex');
        const parts = combined.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Formato de texto cifrado inválido');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Error al descifrar:', error);
        throw new Error('Error al descifrar la API key');
    }
}

/**
 * Genera un hash SHA-256 de un texto (para comparación segura)
 * @param {string} text - Texto a hashear
 * @returns {string} - Hash en hexadecimal
 */
export function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Compara un texto con un hash
 * @param {string} text - Texto a comparar
 * @param {string} hashValue - Hash a comparar
 * @returns {boolean} - True si coinciden
 */
export function compareHash(text, hashValue) {
    const textHash = hash(text);
    return crypto.timingSafeEqual(Buffer.from(textHash), Buffer.from(hashValue));
}

