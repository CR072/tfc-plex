const fs = require("fs");
const bodyParser = require("body-parser");
const settings = require("../../settings.json");

module.exports.load = async function (app, db) {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.get('/setup', (req, res) => {
        if (settings.installing === true) {
            res.sendFile(__dirname + '/views/index.html');
        } else {
            res.status(403).send('Forbidden');
        }
    });

    app.post('/saveSettings', async (req, res) => {
        if (settings.installing === true) {
            const newSettings = req.body;
            settings.name = newSettings.name;
            settings.motd = newSettings.motd;
            settings.icon = newSettings.icon;
            settings.pterodactyl = {
                domain: newSettings.pterodactyl_domain,
                key: newSettings.pterodactyl_key,
                account_key: newSettings.pterodactyl_account_key
            };
            settings.website.port = await getAvailablePort();
    
            settings.installing = false;
            fs.writeFileSync('settings.json', JSON.stringify(settings, null, 2), 'utf-8');
            restartClient();
            res.redirect('/');
        } else {
            res.status(403).send('Forbidden');
        }
    });
function restartClient() {
    console.log('Client is restarting...');
    process.exit();
}

function getAvailablePort() {
    const net = require('net');
    const server = net.createServer();
    return new Promise((resolve, reject) => {
        server.unref();
        server.on('error', reject);
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => {
                resolve(port);
            });
        });
    });
}
}
