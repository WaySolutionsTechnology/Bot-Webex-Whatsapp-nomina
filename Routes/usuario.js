const router = require('express').Router();
let mongoose = require('../config/conexion');
let Usuario = require('../models/cliente');


router.get('/useremail', (req, res, next) => {
    const email = req.query.email;
    Usuario.findOne({ email: email }, { email: 1, _id: 0 }, (err, usuario) => {
        if (err) return next(err);
        if (usuario) {
            res.json(usuario);
        } else {
            res.send(null);
        }
    });
});

router.get('/userwhatsapp', (req, res, next) => {
    const phone = req.query.phone;
    Usuario.findOne({ phone: phone }, { email: 1, _id: 0 }, (err, usuario) => {
        if (err) return next(err);
        if (usuario) {
            res.json(usuario);
        } else {
            res.json(null);
        }
    });
});

module.exports = router;