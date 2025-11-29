const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const auth = require('../middleware/auth');

// GET all clients
router.get('/', auth, async (req, res) => {
    try {
        const clients = await Client.find({ userId: req.user._id });
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create client
router.post('/', auth, async (req, res) => {
    try {
        const { name, address, phone, location } = req.body;
        const newClient = await Client.create({
            name,
            address,
            phone,
            location,
            userId: req.user._id
        });
        res.status(201).json(newClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update client
router.put('/:id', auth, async (req, res) => {
    try {
        const updated = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE client
router.delete('/:id', auth, async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cliente eliminado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
