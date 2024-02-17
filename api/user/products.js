const fs = require('fs/promises');
const products = require("../../prod.json").billing.categories;
const settings = require("../../settings.json")

module.exports.load = async function (app, db) {
    app.get("/prod/buy/:id", async (req, res) => {
        try {
            if (!req.session.pterodactyl) return res.json({ "success": false, "message": "unauthenticated", "redirect": "/login" });
            if (true == true) {
                const cacheaccount = await fetch(
                    settings.pterodactyl.domain + "/api/application/users/" + req.session.pterodactyl.id + "?include=servers",
                    {
                        method: "get",
                        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
                    }
                );

                if (cacheaccount.statusText === "Not Found") {
                    return res.json({ "success": false, "message": "INVALIDUSER" });
                }

                const cacheaccountinfo = await cacheaccount.json();
                if (!cacheaccountinfo) {
                    return res.json({ "success": false, "message": "PANELERROR" });
                }

                const productId = req.params.id;
                const product = products.find(product => product.id === productId);

                if (!product) {
                    return res.json({ "success": false, "message": "Product not found " + product });
                }

                const { wram, wdisk, wbackups, wallocations, wdatabases, wegg, wlocation, cost } = product;
                const description = "server";

                req.session.pterodactyl = cacheaccountinfo.attributes;
                if (req.query.name && description && wram && wdisk && req.query.cpu && wbackups && wallocations && wdatabases && wegg && wlocation) {
                    try {
                        decodeURIComponent(req.query.name);

                        // Coins des Benutzers abziehen
                        const coins = await db.get("coins-" + req.session.userinfo.id) ?? 0;
                        if (coins < cost) {
                            return res.json({ "success": false, "message": "TOOLITTLECOINS" });
                        }

                        // Server-Erstellung
                        const serverinfo = await fetch(
                            settings.pterodactyl.domain + "/api/application/servers",
                            {
                                method: "post",
                                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
                                body: JSON.stringify({
                                    name: req.query.name,
                                    user: req.session.pterodactyl.id,
                                    egg: wegg,
                                    docker_image: "",
                                    startup: "",
                                    environment: "",
                                    limits: {
                                        memory: wram,
                                        cpu: wcpu,
                                        disk: wdisk,
                                        swap: -1,
                                        io: 500
                                    },
                                    feature_limits: {
                                        databases: wdatabases,
                                        backups: wbackups,
                                        allocations: wallocations
                                    },
                                    deploy: {
                                        locations: [wlocation],
                                        dedicated_ip: false,
                                        port_range: []
                                    }
                                })
                            }
                        );

                        const serverInfoText = await serverinfo.json();

                        if (serverinfo.statusText !== "Created") {
                            console.log(serverInfoText);
                            return res.json({ "success": false, "message": serverInfoText.errors[0].detail });
                        }

                        // Aktualisieren der Benutzersitzung mit den neuen Serverinformationen
                        let newpterodactylinfo = req.session.pterodactyl;
                        newpterodactylinfo.relationships.servers.data.push(serverInfoText);
                        req.session.pterodactyl = newpterodactylinfo;

                        // Aktualisieren der Coins des Benutzers
                        const newCoins = coins - cost;
                        await db.set("coins-" + req.session.userinfo.id, newCoins);

                        return res.json({ "success": true, "message": "Server successfully created" });
                    } catch (err) {
                        return res.json({ "success": false, "message": "alerts.INVALIDSERVERNAME" });
                    }
                } else {
                    return res.json({ "success": false, "message": "Missing variables for server creation" });
                }
            } else {
                return res.json({ "success": false, "message": "Server creation is disabled" });
            }
        } catch (error) {
            console.log(error)
            return res.json({ "success": false, "message": "An error occurred while creating the server.", "error": error });
        }
    });
};
