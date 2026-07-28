const https = require('https');

exports.handler = async function(event, context) {
    // Reemplaza esto con el enlace CSV público de tu Google Sheet si es necesario
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS.../pub?output=csv"; 

    return new Promise((resolve, reject) => {
        https.get(SHEET_CSV_URL, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: 200,
                    headers: {
                        "Content-Type": "text/csv; charset=utf-8",
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: data
                });
            });

        }).on('error', (err) => {
            resolve({
                statusCode: 500,
                body: "Error al conectar con la hoja de cálculo: " + err.message
            });
        });
    });
};