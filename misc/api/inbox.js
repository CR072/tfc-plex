const fs = require("fs");
const express = require("express");

module.exports.load = async function (app, db) {
    app.get("/api/inbox", async (req, res) => {
        try {
            // Lese die Benutzer-ID aus der Sitzung
            const userId = req.session.pterodactyl.username; // Hier sollte die Benutzer-ID als Zeichenkette sein

            const alluserId = '@a';

            // Lade Nachrichten aus der inbox.json
            const inboxData = JSON.parse(fs.readFileSync("./inbox.json", "utf8"));

            // Filtere die Nachrichten nur für den eingeloggten Benutzer
            const userMessages = inboxData.messages.filter(message => message.toUserId === userId);
            const userMessages1 = inboxData.messages.filter(message => message.toUserId === alluserId);

            // Sende JSON-Inhalt als Antwort
            res.json({ messages: userMessages,messages: userMessages1 });
        } catch (error) {
            console.error('Error loading inbox data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};
