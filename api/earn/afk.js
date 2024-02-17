const moment = require("moment");
const settings = require("../../settings.json"); // Laden Sie die Einstellungen mit require()

module.exports.load = async function (app, db) {
    // Verwenden Sie ein Objekt, um benutzerspezifische Abkühlzeitstempel zu speichern
    const cooldownMap = {};

    
        app.get("/colenten", (req, res) => {
        res.redirect("/afk");
    });
    
    app.get("/earn-coins", async (req, res) => {
        const userId = req.query.userId;

        // Überprüfen Sie, ob der Benutzer sich noch in der Abkühlphase befindet
        const cooldownTime = cooldownMap[userId] || moment(0);
        const currentTime = moment();
        const cooldownDifference = currentTime.diff(cooldownTime, 'seconds');

        if (cooldownDifference < 60) {
            res.json({ coins: await db.get("coins-" + userId) || 0 });
            return;
        }

        // Münzen am Ende der Abkühlzeit hinzufügen
        let coins = await db.get("coins-" + userId) || 0;
        coins += settings.afk.coins; // Verwenden Sie die Einstellungen für die Münzanzahl
        await db.set("coins-" + userId, coins);

        // Den neuen Abkühlzeitstempel setzen
        cooldownMap[userId] = moment();

        res.json({ coins: coins });
    });
};
