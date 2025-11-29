const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['normal', 'high'],
        default: 'normal'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    description: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

DeliverySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Delivery', DeliverySchema);
