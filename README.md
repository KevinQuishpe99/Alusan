# Perseo API Server

Servidor API para procesamiento optimizado de productos de Perseo con agrupación por código padre, descarga paralela de imágenes y compresión WebP.

## 🚀 Características

- **Extracción Segmentada**: Obtiene productos por categoría para evitar sobrecarga
- **Hidratación Paralela**: Descarga todas las imágenes y existencias simultáneamente usando paralelismo masivo
- **Compresión WebP**: Reduce el tamaño de las imágenes de megabytes a kilobytes
- **Agrupación Inteligente**: Agrupa productos por código padre (separado por guion)
- **Consulta de Existencias**: Obtiene existencias del almacén configurado en paralelo
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
PERSEO_API_KEY=SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-
API_BASE_URL=https://accesoalnusan.app/api
API_KEY=SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-
API_SECRET_KEY=clave_secreta_para_cifrado_opcional
ALMACEN_ID=2
IMAGE_REQUEST_TIMEOUT=10000
```

**Variables de entorno:**
- `PORT` - Puerto del servidor (default: 3001)
- `PERSEO_API_KEY` - API Key de Perseo (para consultas internas a Perseo)
- `API_BASE_URL` - URL base de la API de Perseo (default: https://accesoalnusan.app/api)
- `API_KEY` - API Key para autenticación de los endpoints (default: usa el mismo valor que PERSEO_API_KEY)
- `API_SECRET_KEY` - Clave secreta para cifrado (opcional, se genera automáticamente si no se proporciona)
- `ALMACEN_ID` - ID del almacén para consultar existencias (default: 2)
- `IMAGE_REQUEST_TIMEOUT` - Timeout para peticiones de imágenes en ms (default: 10000)

**Nota importante:** Por defecto, `API_KEY` usa el mismo valor que `PERSEO_API_KEY`. Si quieres usar una API key diferente para autenticación, puedes configurar `API_KEY` por separado.

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

## 📚 Documentación Swagger

La documentación interactiva de la API está disponible en:

```
http://localhost:3001/api-docs
```

Puedes explorar todos los endpoints, ver ejemplos de peticiones y respuestas, y probar la API directamente desde la interfaz de Swagger.

**Nota:** En los ejemplos de Swagger, el campo `api_key` aparece vacío (`""`) por seguridad. Debes usar tu API key real al hacer las peticiones.

## 📡 Endpoints

### 🔐 Autenticación

**TODOS los endpoints requieren autenticación mediante API key en el body de la petición (incluyendo /api/health).**

La API key se almacena como hash SHA-256 para mayor seguridad y se valida mediante comparación segura contra timing attacks.

**Ejemplo de body con API key:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Nota:** La API key es la misma que se usa para consultas a Perseo (`PERSEO_API_KEY`). Por defecto, `API_KEY` usa el mismo valor que `PERSEO_API_KEY`, pero puedes configurarla por separado si lo deseas.

### POST `/api/productos`

Obtiene productos agrupados por código padre de una categoría específica. **Internamente procesa todo**: obtiene productos, descarga imágenes en paralelo, las comprime a WebP, consulta existencias del almacén configurado y las agrupa por código padre.

**Body requerido:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-",
  "categoria_id": 126,
  "almacen_id": 2
}
```
O usando nombre de categoría:
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-",
  "categoria_nombre": "VARIEDADES",
  "almacen_id": 2
}
```

**Parámetros del body:**
- `api_key` (requerido) - API Key de autenticación
- `categoria_id` (opcional) - ID numérico de la categoría (ej: `126`)
- `categoria_nombre` (opcional) - Nombre de la categoría (ej: `VARIEDADES`)
- `almacen_id` (opcional) - ID del almacén para consultar existencias (default: `2`)

**Nota:** Debe proporcionar `categoria_id` o `categoria_nombre`, no ambos. Si no se envía `almacen_id`, se usará el almacén 2 por defecto.

**Ejemplo de uso:**
```bash
# Usando ID de categoría (más rápido)
POST http://localhost:3001/api/productos
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-",
  "categoria_id": 126,
  "almacen_id": 2
}

# Usando nombre de categoría
POST http://localhost:3001/api/productos
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-",
  "categoria_nombre": "VARIEDADES",
  "almacen_id": 2
}
```

**Respuesta:**
```json
{
  "categoria": "VARIEDADES",
  "categoria_id": 126,
  "total_productos": 25,
  "total_grupos": 12,
  "tiempo_procesamiento_ms": 2340,
  "productos": [
    {
      "codigo_padre": "JARTER00021",
      "tiene_variantes": true,
      "variantes": [
        {
          "productosid": 1201,
          "productocodigo": "JARTER00021-az",
          "descripcion": "Cartera Elegante Azul",
          "precio": 45.00,
          "stock": 10,
          "existenciastotales": 359,
          "imagenes_data": ["data:image/webp;base64,..."]
        },
        {
          "productosid": 1202,
          "productocodigo": "JARTER00021-do",
          "descripcion": "Cartera Elegante Dorado",
          "precio": 48.00,
          "stock": 5,
          "existenciastotales": 120,
          "imagenes_data": ["data:image/webp;base64,..."]
        }
      ]
    }
  ]
}
```

### GET `/api/categorias`

Lista todas las categorías disponibles.

**Ejemplo de uso:**
```bash
GET http://localhost:3001/api/categorias
```

**Respuesta:**
```json
[
  {
    "id": 126,
    "nombre": "VARIEDADES"
  },
  {
    "id": 127,
    "nombre": "ELECTRÓNICA"
  }
]
```

### POST `/api/almacenes`

Lista todos los almacenes disponibles en Perseo.

**Body requerido:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Ejemplo de uso:**
```bash
POST http://localhost:3001/api/almacenes
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Respuesta:**
```json
{
  "success": true,
  "total": 35,
  "almacenes": [
    {
      "id": 1,
      "nombre": "3. NS 10 DE AGOSTO"
    },
    {
      "id": 2,
      "nombre": "2. CEDI PROMOCIONAL"
    },
    {
      "id": 3,
      "nombre": "T. 4R QUITO"
    }
  ]
}
```

### POST `/api/cache/stats`

Obtiene estadísticas del caché (hits, misses, keys).

**Body requerido:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Ejemplo de uso:**
```bash
POST http://localhost:3001/api/cache/stats
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

### POST `/api/cache/clear`

Limpia todo el caché manualmente.

**Body requerido:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Ejemplo de uso:**
```bash
POST http://localhost:3001/api/cache/clear
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

### POST `/api/health`

Verifica el estado del servidor y configuración.

**Body requerido:**
```json
{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

**Ejemplo de uso:**
```bash
POST http://localhost:3001/api/health
Content-Type: application/json

{
  "api_key": "SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-"
}
```

## 🏗️ Arquitectura

El proyecto está estructurado en tres capas principales:

### 1. Extracción (`src/api/client.js`)
- Obtiene ID de categoría por nombre
- Obtiene productos filtrados por categoría
- Descarga imágenes en paralelo

### 2. Hidratación (`src/utils/imageProcessor.js`)
- Comprime imágenes a formato WebP
- Convierte a base64 para fácil transmisión
- Procesa múltiples imágenes simultáneamente

### 3. Refactorización (`src/utils/productGrouper.js`)
- Extrae código padre (texto antes del guion)
- Agrupa productos por código padre
- Determina si tiene variantes

## 🔄 Flujo de Procesamiento

1. **Extracción**: Se obtiene el ID de la categoría y luego sus productos
2. **Hidratación Paralela**: Todas las imágenes se descargan simultáneamente
3. **Compresión**: Las imágenes se comprimen a WebP en paralelo
4. **Agrupación**: Los productos se organizan por código padre
5. **Respuesta**: Se devuelve el JSON estructurado

## ⚡ Optimizaciones de Velocidad

- **Paralelismo Extremo**: 80 descargas y 50 compresiones simultáneas
- **Compresión WebP Ultra Rápida**: 250px, calidad 65%, effort 0
- **Skip Inteligente**: No comprime imágenes ya pequeñas (<50KB)
- **Caché en Memoria**: Respuestas instantáneas en peticiones repetidas
- **Procesamiento Selectivo**: Solo procesa lo necesario
- **Agrupación Optimizada**: Algoritmos rápidos con pre-allocación
- **Timeout Agresivo**: 2s por imagen para evitar bloqueos

## 🚀 Despliegue en Render

### Configuración en Render

1. **Crear nuevo Web Service** en Render
2. **Conectar tu repositorio** (GitHub/GitLab)
3. **Configurar las siguientes variables de entorno** en Render:

```
PERSEO_API_KEY=SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-
API_BASE_URL=https://accesoalnusan.app/api
API_KEY=SGqmr7Cf4Gn634pGdqZIdISfTZ4SGfeur9IRPLSuM2I-
ALMACEN_ID=2
PORT=10000
```

**Nota:** Render asigna automáticamente el puerto, pero puedes configurarlo explícitamente.

4. **Build Command:** (dejar vacío o `npm install`)
5. **Start Command:** `npm start`

### Requisitos de Render

- **Node.js Version:** 18.x o superior
- **Plan Recomendado:** Starter o superior (para mejor rendimiento con Sharp)
- **Memory:** Mínimo 512MB (recomendado 1GB para procesamiento de imágenes)

### Variables de Entorno en Render

Asegúrate de configurar estas variables en el dashboard de Render:

- `PERSEO_API_KEY` - Tu API key de Perseo
- `API_BASE_URL` - URL base de la API (default: https://accesoalnusan.app/api)
- `PORT` - Puerto del servidor (Render lo asigna automáticamente, pero puedes configurarlo)

## 🛠️ Tecnologías Utilizadas

- **Express**: Framework web para Node.js
- **Axios**: Cliente HTTP para peticiones
- **Sharp**: Procesamiento y compresión de imágenes
- **dotenv**: Manejo de variables de entorno

## 📝 Notas

- El servidor procesa las imágenes en paralelo, por lo que el tiempo total es igual al de la imagen más lenta, no a la suma de todas
- Las imágenes se comprimen automáticamente a WebP para reducir el tamaño del JSON final
- Los productos se agrupan automáticamente por código padre (texto antes del guion)

## 🐛 Troubleshooting

Si encuentras errores:

1. Verifica que las variables de entorno estén correctamente configuradas
2. Asegúrate de que la API_KEY sea válida
3. Revisa los logs del servidor para más detalles
4. Verifica la conectividad con `https://accesoalnusan.app/api`

## 📄 Licencia

ISC

