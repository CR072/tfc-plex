const fs = require("fs");
const fetch = require("node-fetch");
const { pterodactyl: pteroSettings, purge: purgeSettings } = require("../settings.json");
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
});

module.exports.load = async function (app, db) {
    app.post("/api/purge", apiLimiter, async (req, res) => {
        try {
            // Input Validation
            if (!req.session.pterodactyl || typeof req.session.pterodactyl.id !== 'string') {
                return res.status(400).json({ success: false, message: "Invalid session." });
            }

            // Fetching user account information from Pterodactyl API
            const cacheAccount = await fetch(
                `${pteroSettings.domain}/api/application/users/${req.session.pterodactyl.id}?include=servers`,
                {
                    method: "get",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${pteroSettings.key}`,
                    },
                }
            );

            if (cacheAccount.statusText === "Not Found") {
                return res.status(404).json({ success: false, message: "User not found." });
            }

            const cacheAccountInfo = JSON.parse(await cacheAccount.text());
            req.session.pterodactyl = cacheAccountInfo.attributes;

            // Checking if the user is an admin
            if (!cacheAccountInfo.attributes.root_admin) {
                return res.status(403).json({ success: false, message: "Not an admin." });
            }

            // Fetching the list of servers from Pterodactyl API
            const response = await fetch(`${pteroSettings.domain}/api/application/servers`, {
                headers: {
                    Authorization: `Bearer ${pteroSettings.key}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get server list: ${response.status} ${response.statusText}`);
            }

            const { data: servers } = await response.json();

            // Filtering inactive servers based on the keyword
            const inactiveServers = servers.filter(
                (server) => !server.attributes.name.includes(purgeSettings.keyword)
            );

            // Deleting inactive servers
            for (const server of inactiveServers) {
                try {
                    const { id: serverId, name: serverName } = server.attributes;
                    const deleteResponse = await fetch(`${pteroSettings.domain}/api/application/servers/${serverId}`, {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${pteroSettings.key}`,
                            "Content-Type": "application/json",
                        },
                    });

                    if (deleteResponse.ok) {
                        console.log(`Server ${serverName} deleted successfully.`);
                    } else {
                        console.error(`Failed to delete server ${serverName}: ${deleteResponse.status} ${deleteResponse.statusText}`);
                    }
                } catch (error) {
                    console.error(`Failed to delete server ${server.attributes.name}: ${error}`);
                }
            }

            console.log("All servers purged successfully");
            res.sendStatus(200);
        } catch (error) {
            console.error(`Failed to purge servers: ${error.message}`);
            res.sendStatus(500);
        }
    });
};
