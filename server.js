import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import { PORT, CACHE_TTL_CATEGORIAS, CACHE_TTL_PRODUCTOS, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_COMPRESSION } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { setupCategoriasRoutes } from './routes/categorias.js';
import { setupProductosRoutes } from './routes/productos.js';
import { setupAlmacenesRoutes } from './routes/almacenes.js';
import { setupCacheRoutes } from './routes/cache.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Servir documentación estática
app.use('/docs', express.static('docs'));

// Redirección de raíz a documentación
app.get('/', (req, res) => {
    res.redirect('/docs');
});

// Configuración de caché
const cacheCategorias = new NodeCache({ stdTTL: CACHE_TTL_CATEGORIAS });
const cacheProductos = new NodeCache({ stdTTL: CACHE_TTL_PRODUCTOS });

// Configurar rutas
setupCategoriasRoutes(app, cacheCategorias);
setupAlmacenesRoutes(app);
setupProductosRoutes(app, cacheProductos, cacheCategorias);
setupCacheRoutes(app, cacheCategorias, cacheProductos);

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 Servidor intermedio optimizado listo');
    console.log(`📍 URL: http://localhost:${PORT}\n`);
    console.log('📡 Endpoints disponibles (todos requieren API key en el body):');
    console.log(`   GET  /                            - Redirige a documentación (/docs)`);
    console.log(`   GET  /docs                        - Documentación estática HTML`);
    console.log(`   POST /api/categorias              - Lista todas las categorías completas (caché: ${CACHE_TTL_CATEGORIAS}s)`);
    console.log(`   POST /api/categorias/list          - Lista simplificada de categorías (solo ID y nombre)`);
    console.log(`   POST /api/almacenes               - Lista todos los almacenes disponibles`);
    console.log(`   POST /api/productos               - Productos por categoría (body: categoria_id o categoria_nombre)`);
    console.log(`   POST /api/cache/stats             - Estadísticas del caché`);
    console.log(`   POST /api/cache/clear            - Limpiar caché\n`);
    console.log('🔐 Autenticación: Todos los endpoints requieren API key en el body');
    console.log(`   API Key configurada: ${process.env.API_KEY ? '✅ Configurada' : '⚠️  Usando valor por defecto'}\n`);
    
    console.log('⚡ Optimizaciones EXTREMAS de velocidad activas:');
    console.log(`   🚀 Paralelismo extremo (${MAX_CONCURRENT_REQUESTS} descargas, ${MAX_CONCURRENT_COMPRESSION} compresiones simultáneas)`);
    console.log(`   ⚡ Procesamiento optimizado (skip compresión si < 50KB bytes)`);
    console.log(`   🗜️  Compresión WebP mínima (250px, calidad 65%, effort 0)`);
    console.log(`   ⏱️  Timeout configurado (10000ms por imagen)`);
    console.log(`   📦 Agrupación optimizada (indexOf + pre-allocación)`);
    console.log(`   💾 Caché en memoria (categorías: ${CACHE_TTL_CATEGORIAS}s, productos: ${CACHE_TTL_PRODUCTOS}s)`);
    console.log(`   🔇 Logs mínimos + procesamiento selectivo\n`);
});
