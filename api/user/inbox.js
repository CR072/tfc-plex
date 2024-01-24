const fs = require("fs");
const express = require("express");

module.exports.load = async function (app, db) {
    app.get("/api/inbox", async (req, res) => {
        try {
            const userId = req.session.pterodactyl.username;

            const alluserId = '@a';
            const inboxData = JSON.parse(fs.readFileSync("./inbox.json", "utf8"));
            const userMessages = inboxData.messages.filter(message => message.toUserId === userId);
            const userMessages1 = inboxData.messages.filter(message => message.toUserId === alluserId);
            res.json({ messages: userMessages,messages: userMessages1 });
        } catch (error) {
            console.error('Error loading inbox data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};
