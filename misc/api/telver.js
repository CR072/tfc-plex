const textflow = require("textflow.js");
const indexjs = require("../index.js");
const fs = require("fs");

// Setzen Sie Ihren TextFlow API-Schlüssel
textflow.useKey("bNpRcmaCMfhr1QWYBdaxQB8yoFR8MJzHbLI4sYpTrV3RFoijMHeW0kr1v8x8X35a");

module.exports.load = async function (app, db) {
    app.get("/verify", async (req, res) => {
        if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });

        let theme = indexjs.get(req);

        let phoneNumber = req.query.phoneNumber; // Annahme: Die Telefonnummer wird als Query-Parameter übergeben

        if (!phoneNumber) return res.status(400).json({ error: "Missing phoneNumber in query parameter" });

        // Generiere einen zufälligen Verifizierungscode
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        // Hier können Sie die Telefonnummer in der Benutzersession speichern
        req.session.userinfo.phoneNumber = phoneNumber;

        // Speichern Sie den Verifizierungscode in der Datenbank
        await db.set("verificationCode-" + req.session.userinfo.id, verificationCode);

        try {
            // Senden Sie die Verifizierungsnachricht über die TextFlow API
            await textflow.sendVerificationSMS(phoneNumber, { code: verificationCode });

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error sending verification message:", error);
            res.status(500).json({ error: "Failed to send verification message" });
        }

        // Sie können auch andere Aktualisierungen in der Datenbank oder Logs durchführen, falls erforderlich.

        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    });
};
