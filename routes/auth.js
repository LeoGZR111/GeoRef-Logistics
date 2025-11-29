// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'CLAVE_SECRETA_SUPER_SEGURA'; // Use env var in production

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const user = await User.create({ name, email, password });

    // Generate Token
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Usuario registrado',
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Generate Token
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login exitoso',
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;