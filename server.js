import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import { PORT, CACHE_TTL_CATEGORIAS, CACHE_TTL_PRODUCTOS } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { setupCategoriasRoutes } from './routes/categorias.js';
import { setupSubcategoriasRoutes } from './routes/subcategorias.js';
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
setupSubcategoriasRoutes(app, cacheCategorias);
setupAlmacenesRoutes(app);
setupProductosRoutes(app, cacheProductos, cacheCategorias);
setupCacheRoutes(app, cacheCategorias, cacheProductos);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Perseo API escuchando en http://localhost:${PORT} (docs: /docs)`);
});
