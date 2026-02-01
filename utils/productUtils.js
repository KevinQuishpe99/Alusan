/**
 * Función lógica para agrupar por código padre (OPTIMIZADA PARA VELOCIDAD)
 * Usa técnicas de optimización: pre-allocación, indexOf más rápido que split
 * @param {Array} lista - Lista de productos con imágenes
 * @returns {Array} - Productos agrupados por código padre
 */
export function agruparProductos(lista) {
    const mapaPadres = {};
    const resultados = [];

    // Optimización: pre-calcular códigos padre para evitar múltiples operaciones
    for (let i = 0; i < lista.length; i++) {
        const item = lista[i];
        const codigoOriginal = item.productocodigo || "";
        
        // Optimización: indexOf es más rápido que split para encontrar el guion
        const indiceGuion = codigoOriginal.indexOf('-');
        const codigoPadre = indiceGuion > 0 
            ? codigoOriginal.substring(0, indiceGuion)
            : codigoOriginal;

        let grupo = mapaPadres[codigoPadre];
        
        if (!grupo) {
            grupo = {
                codigo_padre: codigoPadre,
                tiene_variantes: false,
                variantes: []
            };
            mapaPadres[codigoPadre] = grupo;
            resultados.push(grupo); // Mantener orden de inserción
        }

        grupo.variantes.push(item);
        
        // Optimización: solo marcar una vez cuando llega el segundo
        if (grupo.variantes.length === 2) {
            grupo.tiene_variantes = true;
        }
    }

    return resultados;
}

/**
 * Busca el ID de una categoría por nombre
 * @param {string} nombreCategoria - Nombre de la categoría a buscar
 * @param {Object} cacheCategorias - Cache de categorías
 * @param {string} API_BASE_URL - URL base de la API
 * @param {string} PERSEO_API_KEY - API key de Perseo
 * @returns {Promise<number|null>} - ID de la categoría o null si no se encuentra
 */
export async function buscarCategoriaPorNombre(nombreCategoria, cacheCategorias, API_BASE_URL, PERSEO_API_KEY) {
    const axios = (await import('axios')).default;
    const cacheKey = 'categorias_all';
    
    // Intentar obtener desde caché primero
    let categorias = cacheCategorias.get(cacheKey);
    
    if (!categorias || !categorias.data) {
        // Si no hay en caché, consultar a Perseo
        try {
            const response = await axios.post(`${API_BASE_URL}/productos_categorias_consulta`, {
                "api_key": PERSEO_API_KEY,
                "descripcion": ""
            });
            
            if (response.data && response.data.categorias) {
                categorias = {
                    success: true,
                    data: response.data.categorias
                };
                // Guardar en caché
                cacheCategorias.set(cacheKey, categorias);
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error al buscar categoría:", error.message);
            return null;
        }
    }
    
    // Buscar la categoría por nombre (case-insensitive - sin importar mayúsculas/minúsculas)
    // Asegurar que nombreCategoria sea un string
    const nombreCategoriaStr = String(nombreCategoria || '').trim();
    if (!nombreCategoriaStr) {
        return null;
    }
    
    const nombreCategoriaNormalizado = nombreCategoriaStr.toLowerCase();
    const categoriaEncontrada = categorias.data.find(cat => {
        if (!cat.descripcion) return false;
        const descripcionNormalizada = String(cat.descripcion).trim().toLowerCase();
        return descripcionNormalizada === nombreCategoriaNormalizado;
    });
    
    return categoriaEncontrada ? categoriaEncontrada.productos_categoriasid : null;
}

