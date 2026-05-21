/**
 * Swagger / OpenAPI Configuration
 */
import swaggerJsdoc from 'swagger-jsdoc';
import config from './index';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MLA Grievance Management System API',
      version: '1.0.0',
      description: 'Enterprise Smart Grievance Management & Public Service Monitoring System',
      contact: {
        name: 'MLA Admin',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}/api/${config.app.apiVersion}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/routes.ts', './src/modules/**/route.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
