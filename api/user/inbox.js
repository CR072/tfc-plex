const fs = require("fs");
const express = require("express");

module.exports.load = async function (app, db) {
    app.get("/api/inbox", async (req, res) => {
        try {
            if (!req.session.pterodactyl || !req.session.pterodactyl.username) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userId = req.session.pterodactyl.username;
            const allUserId = '@a';

            const inboxData = JSON.parse(fs.readFileSync("./inbox.json", "utf8"));
            const userMessages = inboxData.messages.filter(message => message.toUserId === userId);
            const allUserMessages = inboxData.messages.filter(message => message.toUserId === allUserId);

            res.json({ userMessages, allUserMessages });
        } catch (error) {
            console.error('Error loading inbox data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};
