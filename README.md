# Perseo API Server

Servidor API para procesamiento optimizado de productos de Perseo con agrupación por código padre.

## 🚀 Características

- **Procesamiento Paralelo**: Descarga imágenes y existencias simultáneamente
- **Agrupación Inteligente**: Agrupa productos por código padre (separado por guion)
- **Consulta de Existencias**: Obtiene existencias del almacén especificado
- **Alta Performance**: Optimizado para velocidad máxima

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn

## 🔧 Instalación

1. Clona o descarga el proyecto
2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno creando un archivo `.env` en la raíz del proyecto:

```env
PORT=3001
PERSEO_API_KEY=tu_api_key_aqui
API_BASE_URL=https://accesoalnusan.app/api
API_KEY=tu_api_key_aqui
IMAGE_REQUEST_TIMEOUT=10000
```

**Variables de entorno:**
- `PORT` - Puerto del servidor (default: 3001)
- `PERSEO_API_KEY` - API Key de Perseo (para consultas internas a Perseo)
- `API_BASE_URL` - URL base de la API de Perseo (default: https://accesoalnusan.app/api)
- `API_KEY` - API Key para autenticación de los endpoints (default: usa el mismo valor que PERSEO_API_KEY)
- `IMAGE_REQUEST_TIMEOUT` - Timeout para peticiones de imágenes en ms (default: 10000)

## 🏃 Ejecución

### Modo Producción
```bash
npm start
```

### Modo Desarrollo (con auto-reload)
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## 📚 Documentación

Documentación interactiva con **[Scalar](https://scalar.com)** (misma guía que antes, ahora con “Try it” en el navegador):

- **Local:** `http://localhost:3001/docs` o `http://localhost:3001/` (redirige automáticamente)
- **Producción:** `https://alusan.onrender.com/docs` o `https://alusan.onrender.com/` (redirige automáticamente)
- **Especificación OpenAPI:** `docs/openapi.yaml` (fuente única de la documentación)

## 📡 Endpoints

### 🔐 Autenticación

**TODOS los endpoints requieren autenticación mediante API key en el body de la petición.**

**Ejemplo de body con API key:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

### POST `/api/productos`

Obtiene productos agrupados por código padre de una categoría específica.

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui",
  "categoria_id": 126,
  "almacen_id": 2
}
```

O por nombre de categoría:
```json
{
  "api_key": "tu_api_key_aqui",
  "categoria_nombre": "VARIEDADES",
  "almacen_id": 2
}
```

**Parámetros:**
- `api_key` (requerido): API Key de autenticación
- `categoria_id` (opcional*): ID numérico de la categoría
- `categoria_nombre` (opcional*): Nombre de la categoría (case-insensitive)
- `almacen_id` (requerido): ID del almacén para consultar existencias

*Debe proporcionarse al menos uno: `categoria_id` o `categoria_nombre`

**Campos adicionales en cada variante:** además de `productos_categoriasid` y `productos_subcategoriasid`, la respuesta incluye `productos_categorias_nombre` y `productos_subcategorias_nombre` (resueltos desde Perseo con caché de 30 min). En la raíz del JSON también viene `categoria_consultada_nombre`.

### POST `/api/categorias`

Obtiene todas las categorías con información completa.

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

### POST `/api/categorias/list`

Obtiene una lista simplificada de categorías (solo ID y nombre).

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

### POST `/api/almacenes`

Lista todos los almacenes disponibles en Perseo.

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

### POST `/api/cache/stats`

Obtiene estadísticas del caché.

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

### POST `/api/cache/clear`

Limpia todo el caché de categorías y productos.

**Body requerido:**
```json
{
  "api_key": "tu_api_key_aqui"
}
```

## 🚀 Despliegue

El proyecto está configurado para desplegarse en Render. Ver `render.yaml` para configuración.

## 📝 Notas

- Todos los endpoints son **POST** (no GET)
- Todos requieren `api_key` en el body
- Los productos se agrupan por **código padre**
- La búsqueda por nombre de categoría es **case-insensitive**
