/**
 * Middleware HTTP: sin logs por defecto (evita I/O en cada petición).
 */
export function requestLogger(_req, _res, next) {
    next();
}
