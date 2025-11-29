const jwt = require('jsonwebtoken');

// NOTE: In a real app, use process.env.JWT_SECRET
const JWT_SECRET = 'CLAVE_SECRETA_SUPER_SEGURA';

module.exports = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token inválido' });
    }
};
