'use strict';

const { WebhookClient } = require('dialogflow-fulfillment');
const express = require('express');
const app = express();
var localtunnel = require('localtunnel');
const config = require('./config.json');
const cors = require('cors');
const bodyParser = require('body-parser');
let mongoose = require('./config/conexion');
const usuarioRotes = require('./Routes/usuario');
const { getUsuarioEmail, getUsuarioWhatsapp } = require('./Services/servicesUsuario');
const fs = require('fs');

const ciscospark = require(`ciscospark`);
const teams = ciscospark.init({
    credentials: {
        access_token: config.access_token
    }
});
const twilio = require('twilio');
const client = twilio(config.SID, config.Token);

if (mongoose.STATES[mongoose.connection.readyState] == 'connecting') {
    app.listen(config.Port, function() {
        console.info(`Webhook listening on port ${config.Port}!`)
    });
} else {
    console.log("Base de datos no disponible");
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

// routes
app.use('/api', usuarioRotes);


function messagesWebex(agent, fileUrl, mns) {

    return new Promise((resolve, reject) => {
        resolve(true);
        teams.messages.create({
            markdown: `**${mns}**`,
            files: fileUrl,
            roomId: agent.originalRequest.payload.data.data.roomId
        }).then(() =>
            teams.messages.create({
                text: "Ok. ¿Te gustaria explorar algo más? Solo di: Consultar.",
                roomId: agent.originalRequest.payload.data.data.roomId
            })
        )

    });
}

function generateTunnel() {
    return new Promise((resolve, reject) => {
        localtunnel(config.Port, { subdomain: config.subDomine }, function(err, tunnel) {
            if (err) {
                console.log(err);
                reject(err)
            }
            tunnel.url;
            resolve(tunnel.url);
        });
    });
}
async function localTunnel() {
    let response = await generateTunnel();
    console.log(response);
}
// localTunnel();

async function messageWhatsapp(agent, urlPdf) {
    return new Promise((resolve, reject) => {
        client.messages.create({
            from: 'whatsapp:+14155238886',
            to: agent.originalRequest.payload.data.From,
            body: agent.contexts[0].parameters.Evento,
            mediaUrl: urlPdf,
        }).then(mensaje => {
            resolve(mensaje.sid);
        }).catch(err => {
            reject(err);
            console.log(err);
        });
    });
}


async function fileExist(filePath, agent, fileUrl) {
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.F_OK, (err) => {
            if (err) {
                agent.add("*PDF no diponible.* ¿Te gustaria explorar algo más? Solo di: Consultar.");
                reject(false);
            } else {
                if (agent.originalRequest.source == 'spark') {
                    messagesWebex(agent, fileUrl, 'Desprendible de nómina');
                    agent.add("Por favor espere un momento.");
                } else if (agent.originalRequest.source == 'twilio') {
                    messageWhatsapp(agent, fileUrl);
                    agent.add("Ok. ¿Te gustaria explorar algo más? Solo di: Consultar.");
                }
                resolve(true);
            }

        })
    });
}





async function test(data, agent) {
    try {
        if (!data) {
            agent.add("*No existe registro con ese número.* ¿Te gustaria explorar algo más? Solo di: Consultar.")
        } else {
            let email = data.email;
            email = email.substring(0, email.lastIndexOf("@"));
            let fileUrl = config.ngGrok + config.path + email;

            if (agent.contexts[0].parameters.Evento == 'Desprendible de nómina') {
                let filePath = "." + config.path + email + "Nomina.pdf";
                fileUrl = fileUrl + 'Nomina.pdf';
                await fileExist(filePath, agent, fileUrl);

            } else if (agent.contexts[0].parameters.Evento == 'Certificación laboral') {

                let filePath = "." + config.path + email + "CertiLaboral.pdf";
                fileUrl = fileUrl + 'CertiLaboral.pdf';
                await fileExist(filePath, agent, fileUrl);

            } else if (agent.contexts[0].parameters.Evento == 'Certificado de retención') {
                let filePath = "." + config.path + email + "CertiRetenciones.pdf";
                fileUrl = fileUrl + "CertiRetenciones.pdf";
                await fileExist(filePath, agent, fileUrl);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function consultarInspeccionNumero(agent) {
    try {
        if (agent.originalRequest.source == 'spark') {
            var data = await getUsuarioEmail(agent.originalRequest.payload.data.data.personEmail);
            await test(data, agent)
        } else if (agent.originalRequest.source == 'twilio') {
            var whatsapp = agent.originalRequest.payload.data.From
            whatsapp = whatsapp.slice(12);
            var data = await getUsuarioWhatsapp(whatsapp);
            await test(data, agent);
        }
    } catch (error) {
        console.log(error);
    }
}

function WebhookProcessing(req, res) {
    const agent = new WebhookClient({ request: req, response: res });
    let intentMap = new Map();
    intentMap.set('Actividad', consultarInspeccionNumero);
    agent.handleRequest(intentMap);
}


// Webhook
app.post('/', function(req, res) {
    WebhookProcessing(req, res);
});