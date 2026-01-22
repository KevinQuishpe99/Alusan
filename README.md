# Perseo API Server

Servidor API para procesamiento optimizado de productos de Perseo con agrupación por código padre, descarga paralela de imágenes y compresión WebP.

## 🚀 Características

- **Extracción Segmentada**: Obtiene productos por categoría para evitar sobrecarga
- **Hidratación Paralela**: Descarga todas las imágenes simultáneamente usando paralelismo masivo
- **Compresión WebP**: Reduce el tamaño de las imágenes de megabytes a kilobytes
- **Agrupación Inteligente**: Agrupa productos por código padre (separado por guion)
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
```

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

## 📡 Endpoints

### GET `/api/productos/:id` o `/api/productos/:nombre`

Obtiene productos agrupados por código padre de una categoría específica. **Internamente procesa todo**: obtiene productos, descarga imágenes en paralelo, las comprime a WebP y las agrupa por código padre.

**Parámetros:**
- `:id` - ID numérico de la categoría (ej: `126`)
- `:nombre` - Nombre de la categoría (ej: `VARIEDADES`)

**Ejemplo de uso:**
```bash
# Usando ID de categoría (más rápido)
GET http://localhost:3001/api/productos/126

# Usando nombre de categoría
GET http://localhost:3001/api/productos/VARIEDADES
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
      "tiene_variables": true,
      "variantes": [
        {
          "productosid": 1201,
          "productocodigo": "JARTER00021-az",
          "descripcion": "Cartera Elegante Azul",
          "precio": 45.00,
          "stock": 10,
          "imagen_data": "data:image/webp;base64,..."
        },
        {
          "productosid": 1202,
          "productocodigo": "JARTER00021-do",
          "descripcion": "Cartera Elegante Dorado",
          "precio": 48.00,
          "stock": 5,
          "imagen_data": "data:image/webp;base64,..."
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

### GET `/api/cache/stats`

Obtiene estadísticas del caché (hits, misses, keys).

**Ejemplo de uso:**
```bash
GET http://localhost:3001/api/cache/stats
```

### DELETE `/api/cache/clear`

Limpia todo el caché manualmente.

**Ejemplo de uso:**
```bash
DELETE http://localhost:3001/api/cache/clear
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
PERSEO_API_KEY=tu_api_key_aqui
API_BASE_URL=https://accesoalnusan.app/api
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

