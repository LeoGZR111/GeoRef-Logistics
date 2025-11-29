const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const auth = require('../middleware/auth');

// GET all deliveries
router.get('/', auth, async (req, res) => {
    try {
        const deliveries = await Delivery.find({ userId: req.user._id })
            .populate('clientId')
            .populate('driverId');
        res.json(deliveries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create delivery
router.post('/', auth, async (req, res) => {
    try {
        const { clientId, priority, location, description } = req.body;
        const newDelivery = await Delivery.create({
            clientId,
            priority,
            location,
            description,
            userId: req.user._id
        });
        res.status(201).json(newDelivery);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update delivery (assign driver, change status)
router.put('/:id', auth, async (req, res) => {
    try {
        const updated = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE delivery
router.delete('/:id', auth, async (req, res) => {
    try {
        await Delivery.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entrega eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
