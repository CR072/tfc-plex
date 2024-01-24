const fs = require("fs");
const ejs = require("ejs");
const indexjs = require("../../index.js");
const log = require('../../misc/log');
const fetch = require("node-fetch");
const settings = require("../../settings.json");
module.exports.load = async function(app, db) {
  app.get("/buyplan", async (req, res) => {
    let theme = indexjs.get(req);

    let failRedirect = theme.settings.redirect.failedpurchaseplan || "/";
    let successRedirect = theme.settings.redirect.purchaseplan || "/";

    if (!req.query.plan) return res.redirect(`${failRedirect}?err=MISSINGPLAN`);

    let newSettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    let selectedPlan = newSettings.api.client.packages.list[req.query.plan];

    if (!selectedPlan) return res.redirect(`${failRedirect}?err=INVALIDPLAN`);
    if (req.query.plan === newSettings.api.client.packages.default) return res.redirect(`${failRedirect}?err=DEFAULTPLAN`);

    let userCoins = await db.get("coins-" + req.session.userinfo.id);
    userCoins = userCoins ? userCoins : 0;

    let planCost = selectedPlan.cost;

    if (userCoins < planCost) return res.redirect(`${failRedirect}?err=CANNOTAFFORD`);

    let newUserCoins = userCoins - planCost;

    let extra = await db.get("extra-" + req.session.userinfo.id);
    extra = extra ? extra : {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0
    };
    for (let resource in extra) {
      await db.set(resource + "-" + req.session.userinfo.id, 0);
    }
    for (let resource in selectedPlan) {
      extra[resource] = selectedPlan[resource];
      await db.set(resource + "-" + req.session.userinfo.id, extra[resource]);
    }
    if (Object.values(extra).every(value => value === 0)) {
      await db.delete("extra-" + req.session.userinfo.id);
    } else {
      await db.set("extra-" + req.session.userinfo.id, extra);
    }

    await db.set("coins-" + req.session.userinfo.id, newUserCoins);

    log(`Plan Purchased`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought the "${req.query.plan}" plan for \`${planCost}\` Credits.`);

    res.redirect(successRedirect + "?err=none");
  });
  app.get("/buyplans", async (req, res) => {
    let newSettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    let plansList = newSettings.api.client.packages.list;
  
    res.json(plansList);
  });

}
