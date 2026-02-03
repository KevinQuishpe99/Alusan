import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Perseo API Server',
            version: '1.0.0',
            description: `API middleware optimizado que actúa como intermediario entre tu aplicación y el sistema Perseo.

FUNCIONALIDADES PRINCIPALES:

1. Procesamiento de Productos:
   - Obtiene productos de Perseo agrupados por categoría
   - Descarga imágenes en paralelo (hasta 100 simultáneas)
   - Comprime imágenes a formato WebP (250px, calidad 65%)
   - Consulta existencias de almacenes específicos
   - Agrupa productos por código padre (ej: JARTER00021-az → JARTER00021)

2. Optimizaciones de Velocidad:
   - Paralelismo masivo para descargas y compresión
   - Caché en memoria (categorías: 30min, productos: 15min)
   - Procesamiento selectivo (omite compresión si imagen < 50KB)
   - Agrupación optimizada con algoritmos rápidos

3. Gestión de Datos:
   - Consulta de categorías (completa o simplificada)
   - Consulta de almacenes disponibles
   - Validación de almacenes y categorías antes de procesar
   - Estadísticas y gestión de caché

ESTRUCTURA DE RESPUESTA:
Los productos se agrupan por código padre (parte antes del guion). Si un producto tiene código "JARTER00021-az", el código padre es "JARTER00021". Las variantes del mismo producto se agrupan juntas, y cada grupo indica si tiene variantes (tiene_variantes: true/false).

PERFORMANCE:
- Tiempo de respuesta optimizado para grandes volúmenes
- Compresión de imágenes reduce payload en ~90%
- Caché inteligente para respuestas instantáneas en peticiones repetidas`,
            contact: {
                name: 'API Support'
            },
            license: {
                name: 'ISC'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Servidor de desarrollo'
            },
            {
                url: 'https://alusan.onrender.com',
                description: 'Servidor de producción'
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'body',
                    name: 'api_key',
                    description: 'API Key de autenticación (misma que PERSEO_API_KEY)'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Mensaje de error descriptivo'
                        },
                        error: {
                            type: 'string',
                            example: 'CODIGO_ERROR'
                        }
                    }
                },
                Categoria: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 126
                        },
                        nombre: {
                            type: 'string',
                            example: 'VARIEDADES'
                        }
                    }
                },
                Almacen: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 2
                        },
                        nombre: {
                            type: 'string',
                            example: '2. CEDI PROMOCIONAL'
                        }
                    }
                },
                Producto: {
                    type: 'object',
                    properties: {
                        productosid: {
                            type: 'integer',
                            example: 1201
                        },
                        productocodigo: {
                            type: 'string',
                            example: 'JARTER00021-az'
                        },
                        descripcion: {
                            type: 'string',
                            example: 'Cartera Elegante Azul'
                        },
                        precio: {
                            type: 'number',
                            example: 45.00
                        },
                        existenciastotales: {
                            type: 'integer',
                            example: 359
                        },
                        imagenes_data: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            example: ['data:image/webp;base64,...']
                        }
                    }
                },
                GrupoProductos: {
                    type: 'object',
                    properties: {
                        codigo_padre: {
                            type: 'string',
                            example: 'JARTER00021'
                        },
                        tiene_variantes: {
                            type: 'boolean',
                            example: true
                        },
                        variantes: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Producto'
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                ApiKeyAuth: []
            }
        ]
    },
    apis: ['./routes/*.js', './server.js']
};

export const swaggerSpec = swaggerJsdoc(options);

