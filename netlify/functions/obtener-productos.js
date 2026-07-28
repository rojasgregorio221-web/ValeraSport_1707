const https = require('https');

exports.handler = async function(event, context) {
    const urlSecreta = process.env.SHEET_CSV_URL;

    if (!urlSecreta) {
        return {
            statusCode: 500,
            body: "Error: La variable SHEET_CSV_URL no está configurada en Netlify."
        };
    }

    return new Promise((resolve, reject) => {
        https.get(urlSecreta, (res) => {
            let datos = '';
            res.on('data', (chunk) => { datos += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: 200,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                    body: datos
                });
            });
        }).on('error', (err) => {
            resolve({
                statusCode: 500,
                body: "Error al conectar: " + err.message
            });
        });
    });
};