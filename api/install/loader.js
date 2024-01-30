const fs = require("fs");
const bodyParser = require("body-parser");
const settings = require("../../settings.json");

module.exports.load = async function (app, db) {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.get('/setup', (req, res) => {
        const existingSettings = JSON.parse(fs.readFileSync('settings.json', 'utf-8'));
        if (settings.installing === true) {
            res.sendFile(__dirname + '/views/index.html');
        } else {
            res.status(403).send('Forbidden');
        }
    });
    app.post('/saveSettings', (req, res) => {
        const existingSettings = JSON.parse(fs.readFileSync('settings.json', 'utf-8'));
        if (settings.installing === true) {
            const newSettings = req.body;
            const settingsWithDots = replaceUnderscoresWithDots(newSettings, existingSettings);
            settingsWithDots.installing = false;
            fs.writeFileSync('settings.json', JSON.stringify(settingsWithDots, null, 2), 'utf-8');
            restartClient();

            res.redirect('/');
        } else {
            res.status(403).send('Forbidden'); 
        }
    });
};
function replaceUnderscoresWithDots(obj, existingSettings) {
    const result = { ...existingSettings };
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key.startsWith('pterodactyl')) {
                const fieldName = key.replace('pterodactyl_', '');
                result.pterodactyl = result.pterodactyl || {};
                result.pterodactyl[fieldName] = obj[key];
            } else if (key === 'oauth2') {
                const oauth2Settings = obj[key];
                result.api = result.api || {};
                result.api.client = result.api.client || {};
                result.api.client.oauth2 = {
                    ...result.api.client.oauth2,
                    ...oauth2Settings,
                };
            }
        }
    }
    return result;
}

function restartClient() {
    console.log('Client is restarting...');
   process.exit();
}