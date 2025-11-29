const Driver = require('../models/Driver');

exports.getAllDrivers = async (userId) => {
    return await Driver.find({ userId });
};

exports.createDriver = async (data) => {
    return await Driver.create(data);
};
