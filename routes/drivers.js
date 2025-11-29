const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const auth = require('../middleware/auth');

// GET all drivers
router.get('/', auth, async (req, res) => {
    try {
        const drivers = await Driver.find({ userId: req.user._id });
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create driver
router.post('/', auth, async (req, res) => {
    try {
        const { name, vehicle, capacity } = req.body;
        const newDriver = await Driver.create({
            name,
            vehicle,
            capacity,
            userId: req.user._id
        });
        res.status(201).json(newDriver);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update driver
router.put('/:id', auth, async (req, res) => {
    try {
        const updated = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Emit location update if applicable
        if (req.app.get('io') && req.body.currentLocation) {
            req.app.get('io').emit('driverLocationUpdated', updated);
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE driver
router.delete('/:id', auth, async (req, res) => {
    try {
        await Driver.findByIdAndDelete(req.params.id);
        res.json({ message: 'Repartidor eliminado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
