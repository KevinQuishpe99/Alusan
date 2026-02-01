import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import { PORT, CACHE_TTL_CATEGORIAS, CACHE_TTL_PRODUCTOS, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_COMPRESSION } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { setupCategoriasRoutes } from './routes/categorias.js';
import { setupProductosRoutes } from './routes/productos.js';
import { setupCacheRoutes } from './routes/cache.js';
import { setupHealthRoute } from './routes/health.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Configuración de caché
const cacheCategorias = new NodeCache({ stdTTL: CACHE_TTL_CATEGORIAS });
const cacheProductos = new NodeCache({ stdTTL: CACHE_TTL_PRODUCTOS });

// Configurar rutas
setupHealthRoute(app);
setupCategoriasRoutes(app, cacheCategorias);
setupProductosRoutes(app, cacheProductos, cacheCategorias);
setupCacheRoutes(app, cacheCategorias, cacheProductos);

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 Servidor intermedio optimizado listo');
    console.log(`📍 URL: http://localhost:${PORT}\n`);
    console.log('📡 Endpoints disponibles:');
    console.log(`   GET  /api/health                  - Estado del servidor y configuración`);
    console.log(`   GET  /api/categorias              - Lista todas las categorías completas (caché: ${CACHE_TTL_CATEGORIAS}s)`);
    console.log(`   GET  /api/categorias/list          - Lista simplificada de categorías (solo ID y nombre)`);
    console.log(`   GET  /api/productos/:id           - Productos por ID (ej: /api/productos/126)`);
    console.log(`   GET  /api/productos/:nombre       - Productos por nombre (ej: /api/productos/VARIEDADES)`);
    console.log(`   GET  /api/cache/stats             - Estadísticas del caché`);
    console.log(`   DELETE /api/cache/clear           - Limpiar caché\n`);
    
    console.log('⚡ Optimizaciones EXTREMAS de velocidad activas:');
    console.log(`   🚀 Paralelismo extremo (${MAX_CONCURRENT_REQUESTS} descargas, ${MAX_CONCURRENT_COMPRESSION} compresiones simultáneas)`);
    console.log(`   ⚡ Procesamiento optimizado (skip compresión si < 50KB bytes)`);
    console.log(`   🗜️  Compresión WebP mínima (250px, calidad 65%, effort 0)`);
    console.log(`   ⏱️  Timeout configurado (10000ms por imagen)`);
    console.log(`   📦 Agrupación optimizada (indexOf + pre-allocación)`);
    console.log(`   💾 Caché en memoria (categorías: ${CACHE_TTL_CATEGORIAS}s, productos: ${CACHE_TTL_PRODUCTOS}s)`);
    console.log(`   🔇 Logs mínimos + procesamiento selectivo\n`);
});
