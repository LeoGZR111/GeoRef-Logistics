// app.js
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

// IMPORTAR RUTAS
const authRoutes = require('./routes/auth');
const placeRoutes = require('./routes/places');
const polygonRoutes = require('./routes/polygons');
const changeLogRoutes = require('./routes/changeLogs');

// MIDDLEWARES
const errorHandler = require('./middleware/errorHandler');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for dev
    methods: ["GET", "POST"]
  }
});

// Make io available in routes
app.set('io', io);

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));

// RUTAS
app.use('/auth', authRoutes);
app.use('/places', placeRoutes);
app.use('/polygons', polygonRoutes);
app.use('/logs', changeLogRoutes);
app.use('/clients', require('./routes/clients'));
app.use('/deliveries', require('./routes/deliveries'));
app.use('/drivers', require('./routes/drivers'));


// ERROR HANDLING
app.use(errorHandler.logErrors);
app.use(errorHandler.errorHandler);

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Listen for driver location updates from client (e.g. driver app)
  socket.on('updateLocation', async (data) => {
    // data: { driverId, lat, lng }
    // Broadcast to all clients (admin view)
    io.emit('driverLocationUpdated', data);

    // Optionally save to DB here or via API call
    // const Driver = require('./models/Driver');
    // await Driver.findByIdAndUpdate(data.driverId, { ... });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// CONEXIÓN DIRECTA A MONGO
mongoose
  .connect(
    'mongodb+srv://alanfx3:Keeper2003117@cluster25712.lslbiye.mongodb.net/?retryWrites=true&w=majority&appName=cluster25712'
  )
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// LEVANTAR SERVIDOR
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});