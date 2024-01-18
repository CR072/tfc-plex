const fetch = require("node-fetch");
const { pterodactyl: pteroSettings, purge: purgeSettings } = require("../settings.json");

module.exports.load = async function (app, db) {
    app.post("/api/purge", async (req, res) => {
        try {
            if (!req.session.pterodactyl || typeof req.session.pterodactyl.id !== 'string') {
                return res.status(400).json({ success: false, message: "Invalid session." });
            }

            const cacheAccount = await fetchUserAccount(req.session.pterodactyl.id);

            if (cacheAccount.statusText === "Not Found") {
                return res.status(404).json({ success: false, message: "User not found." });
            }

            req.session.pterodactyl = cacheAccount.attributes;

            if (!cacheAccount.attributes.root_admin) {
                return res.status(403).json({ success: false, message: "Not an admin." });
            }

            const servers = await fetchServerList();

            if (!servers.ok) {
                throw new Error(`Failed to get server list: ${servers.status} ${servers.statusText}`);
            }

            const inactiveServers = servers.data.filter(server => !server.attributes.name.includes(purgeSettings.keyword));

            await deleteInactiveServers(inactiveServers);

            console.log("All servers purged successfully");
            res.sendStatus(200);
        } catch (error) {
            console.error(`Failed to purge servers: ${error.message}`);
            res.sendStatus(500);
        }
    });
};

async function fetchUserAccount(userId) {
    const response = await fetch(`${pteroSettings.domain}/api/application/users/${userId}?include=servers`, {
        method: "get",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pteroSettings.key}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user account: ${response.status} ${response.statusText}`);
    }

    return JSON.parse(await response.text()).attributes;
}

async function fetchServerList() {
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

    return response.json();
}

async function deleteInactiveServers(inactiveServers) {
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
}
