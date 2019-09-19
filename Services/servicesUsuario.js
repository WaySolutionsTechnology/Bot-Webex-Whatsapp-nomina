var request = require('request');
const config = require('../config.json');
const fs = require('fs');

module.exports = {
    getUsuarioEmail(email) {
        return new Promise((resolve, reject) => {
            request.get('http://localhost:' + config.Port + '/api/useremail?email=' + email, function(err, res, body, req) {
                if (err) {
                    console.log(err);
                    reject(null)
                }
                body = JSON.parse(body);
                resolve(body)
            });
        });
    },

    getUsuarioWhatsapp(phone) {
        return new Promise((resolve, reject) => {
            request.get('http://localhost:' + config.Port + '/api/userwhatsapp?phone=' + phone, function(err, res, body, req) {
                if (err) {
                    console.log(err);
                    reject(null)
                }
                body = JSON.parse(body);
                resolve(body)
            });
        });
    }
}