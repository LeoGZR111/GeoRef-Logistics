const Client = require('../models/Client');

exports.getAllClients = async (userId) => {
    return await Client.find({ userId });
};

exports.createClient = async (data) => {
    return await Client.create(data);
};
