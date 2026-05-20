/**
 * Logging mínimo: solo errores por defecto (mejor rendimiento en producción).
 * Activar trazas con LOG_VERBOSE=true en .env
 */
const verbose = process.env.LOG_VERBOSE === 'true';

/** @param {unknown[]} args */
export function logVerbose(...args) {
    if (verbose) {
        console.log(...args);
    }
}

/** @param {unknown[]} args */
export function logError(...args) {
    console.error(...args);
}
