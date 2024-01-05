const fs = require("fs");
const fetch = require("node-fetch");
const { pterodactyl: pteroSettings, purge: purgeSettings } = require("../settings.json");

module.exports.load = async function (app, db) {
    app.post("/api/purge", async (req, res) => {
        if (!req.session.pterodactyl) {
            return res.redirect("/login");
        }

        try {
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
                return res.json({ success: false, message: "Invalid user." });
            }

            const cacheAccountInfo = JSON.parse(await cacheAccount.text());
            req.session.pterodactyl = cacheAccountInfo.attributes;

            if (!cacheAccountInfo.attributes.root_admin) {
                return res.json({ success: false, message: "Not an admin." });
            }

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

            const inactiveServers = servers.filter(
                (server) => !server.attributes.name.includes(purgeSettings.keyword)
            );

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
            console.error(`Failed to get server list: ${error.message}`);
            res.sendStatus(500);
        }
    });
};
