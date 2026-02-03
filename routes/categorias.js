import express from 'express';
import { obtenerCategorias } from '../services/perseoService.js';
import { CACHE_TTL_CATEGORIAS } from '../config/index.js';
import { authenticateApiKey } from '../middleware/auth.js';

const router = express.Router();

/**
 * Endpoint: POST /api/categorias/list
 * Lista simplificada de categorías (solo ID y nombre)
 */
export function setupCategoriasRoutes(app, cacheCategorias) {
    app.post('/api/categorias/list', authenticateApiKey, async (req, res) => {
        const cacheKey = 'categorias_list_simple';
        
        const cachedData = cacheCategorias.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const urlCategorias = `${process.env.API_BASE_URL || "https://accesoalnusan.app/api"}/productos_categorias_consulta`;
            console.log(`\n📡 PETICIÓN INTERNA: Consulta de categorías`);
            console.log(`   🔗 URL: ${urlCategorias}`);
            console.log(`   📍 Origen: POST /api/categorias/list`);
            console.log(`   ⏱️  Iniciando petición...`);
            
            const inicioConsulta = Date.now();
            const response = await obtenerCategorias();
            
            const tiempoConsulta = ((Date.now() - inicioConsulta) / 1000).toFixed(2);
            console.log(`   ✅ Respuesta recibida en ${tiempoConsulta}s`);
            console.log(`   📦 Categorías encontradas: ${response?.categorias?.length || 0}`);

            if (response && response.categorias) {
                const categoriasSimplificadas = response.categorias.map(cat => ({
                    id: cat.productos_categoriasid,
                    nombre: cat.descripcion
                }));

                const resultado = {
                    success: true,
                    total: categoriasSimplificadas.length,
                    categorias: categoriasSimplificadas
                };
                
                cacheCategorias.set(cacheKey, resultado);
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron categorías."
                });
            }
        } catch (error) {
            console.error("Error al obtener categorías:", error.message);
            res.status(500).json({
                success: false,
                message: "Error al obtener las categorías."
            });
        }
    });

    /**
     * Endpoint: POST /api/categorias
     * Lista todas las categorías completas
     */
    app.post('/api/categorias', authenticateApiKey, async (req, res) => {
        const cacheKey = 'categorias_all';
        
        const cachedData = cacheCategorias.get(cacheKey);
        if (cachedData) {
            console.log('✅ Categorías servidas desde caché');
            return res.json(cachedData);
        }

        try {
            const urlCategorias = `${process.env.API_BASE_URL || "https://accesoalnusan.app/api"}/productos_categorias_consulta`;
            console.log(`\n📡 PETICIÓN INTERNA: Consulta de categorías`);
            console.log(`   🔗 URL: ${urlCategorias}`);
            console.log(`   📍 Origen: POST /api/categorias`);
            console.log(`   ⏱️  Iniciando petición...`);
            
            const inicioConsulta = Date.now();
            const response = await obtenerCategorias();
            
            const tiempoConsulta = ((Date.now() - inicioConsulta) / 1000).toFixed(2);
            console.log(`   ✅ Respuesta recibida en ${tiempoConsulta}s`);
            console.log(`   📦 Categorías encontradas: ${response?.categorias?.length || 0}`);

            if (response && response.categorias) {
                const resultado = {
                    success: true,
                    data: response.categorias
                };
                
                cacheCategorias.set(cacheKey, resultado);
                console.log('💾 Categorías guardadas en caché');
                res.json(resultado);
            } else {
                res.status(404).json({
                    success: false,
                    message: "No se encontraron categorías en Perseo."
                });
            }
        } catch (error) {
            console.error("Error técnico:", error.message);
            if (error.response) {
                res.status(error.response.status || 500).json({
                    success: false,
                    message: "Error al conectar con el servidor de Perseo.",
                    error: error.response.data
                });
            } else if (error.request) {
                res.status(503).json({
                    success: false,
                    message: "No se pudo conectar con el servidor de Perseo."
                });
            } else {
                console.error("Error completo:", error);
                res.status(500).json({
                    success: false,
                    message: "Error al procesar la solicitud.",
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    type: error.name || 'UnknownError'
                });
            }
        }
    });
}

