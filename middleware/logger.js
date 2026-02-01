/**
 * Middleware de logging para todas las peticiones HTTP entrantes
 */
export function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`\n🌐 PETICIÓN HTTP ENTRANTE [${timestamp}]`);
    console.log(`   📍 Método: ${req.method}`);
    console.log(`   🔗 URL: ${req.originalUrl || req.url}`);
    console.log(`   🌍 IP: ${req.ip || req.connection.remoteAddress}`);
    next();
}

