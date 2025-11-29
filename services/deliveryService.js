const Delivery = require('../models/Delivery');

exports.getAllDeliveries = async (userId) => {
    return await Delivery.find({ userId }).populate('clientId').populate('driverId');
};

exports.createDelivery = async (data) => {
    return await Delivery.create(data);
};
