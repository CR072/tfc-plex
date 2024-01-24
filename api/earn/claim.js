const indexjs = require("../../index.js");
const fs = require("fs");
const moment = require("moment");

module.exports.load = async function (app, db) {
    app.get("/claim", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");

        let theme = indexjs.get(req);
        let settings = JSON.parse(fs.readFileSync("./settings.json").toString());
        if (!settings.claiming.enabled) {
            return res.send(`Claiming is currently disabled. <a href='/dashboard?alert=claimtoosoon'>go back to dashboard</a>`);
        }
        let lastClaimDate = await db.get("lastClaimDate-" + req.session.userinfo.id) || null;
        let currentDate = moment().format("YYYY-MM-DD");

        if (lastClaimDate === currentDate) {
            return res.send(`You have already claimed your coins today. <a href='/dashboard?alert=claimtoosoon'>go back to dashboard</a>`);
        }

        await db.set("lastClaimDate-" + req.session.userinfo.id, currentDate);
        let coinsPerClaim = settings.claiming.coinsPerClaim || 20;
        let coins = await db.get("coins-" + req.session.userinfo.id) || 0;
        coins = coins + coinsPerClaim;
        await db.set("coins-" + req.session.userinfo.id, coins);

        res.send(`You have successfully claimed ${coinsPerClaim} coins. <a href='/dashboard?alert=claim'>go back to dashboard</a>`);
    });
};
