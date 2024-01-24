const indexjs = require("../../index.js");
const fs = require("fs");
const moment = require("moment");
const lastClaimed = {};

module.exports.load = async function (app, db) {
    app.get("/christmas/gifts", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");

        let theme = indexjs.get(req);
        let gifts = await db.get("gifts-" + req.session.userinfo.id) || 0;
        res.render(`../themes/${theme.name}/christmas.ejs`, { gifts: gifts });
    });
    app.get("/claim-gift", async (req, res) => {
        if (!req.session.pterodactyl) {
            return res.redirect("/login");
        }
        const lastClaimTimestamp = lastClaimed[req.session.userinfo.id] || 0;
        const currentTime = moment().unix();
        if (currentTime - lastClaimTimestamp < 1200) {
            return res.redirect(`/dashboard?alert=gifttoosoon`);
        }

        let giftsPerClaim = 1;
        let gifts = await db.get("gifts-" + req.session.userinfo.id) || 0;
        gifts = gifts + giftsPerClaim;
        await db.set("gifts-" + req.session.userinfo.id, gifts);
        lastClaimed[req.session.userinfo.id] = currentTime;
        return res.redirect(`/dashboard?alert=gift`);
    });
};
