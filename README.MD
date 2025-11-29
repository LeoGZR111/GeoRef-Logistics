# DeliveryTrack - Sistema de Georeferencia

DeliveryTrack es una aplicación web diseñada para la gestión y seguimiento de entregas, permitiendo la administración de lugares, polígonos de zonas y registro de actividades.

## 🚀 Características

- **Autenticación de Usuarios**: Registro e inicio de sesión seguro.
- **Gestión de Lugares**: Crear, leer, actualizar y eliminar (CRUD) lugares con coordenadas geográficas.
- **Gestión de Polígonos**: Definición de zonas geográficas mediante polígonos.
- **Historial de Cambios**: Registro de actividades y cambios en el sistema.
- **Interfaz Interactiva**: Visualización de datos en el frontend.

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB (Mongoose)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Seguridad**: bcryptjs (hashing de contraseñas), cors
- **Otros**: dotenv, body-parser, nodemon

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (v14 o superior recomendado)
- [MongoDB](https://www.mongodb.com/) (o acceso a un cluster de MongoDB Atlas)

## 🔧 Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd DeliveryTrack
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configuración de Base de Datos**
   El proyecto actualmente conecta a una base de datos MongoDB. Asegúrate de tener acceso a internet para conectar al cluster configurado en `app.js` o modifica la cadena de conexión según tus necesidades.

## ▶️ Ejecución

### Modo Desarrollo (con recarga automática)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor iniciará en `http://localhost:4000`.

## 📂 Estructura del Proyecto

```
DeliveryTrack/
├── models/         # Modelos de datos (Mongoose)
├── public/         # Archivos estáticos (HTML, CSS, JS del frontend)
├── routes/         # Definición de rutas de la API
├── services/       # Lógica de negocio y servicios
├── app.js          # Punto de entrada de la aplicación
└── package.json    # Dependencias y scripts
```

## 🔗 API Endpoints Principales

- **Auth**: `/auth/login`, `/auth/register`
- **Lugares**: `/places` (GET, POST, PUT, DELETE)
- **Polígonos**: `/polygons`
- **Logs**: `/logs`

## 📝 Licencia

Este proyecto está bajo la Licencia ISC.


hacer dos vistas más - principal y otra.
faltan los middlewares y los CRUDS.
