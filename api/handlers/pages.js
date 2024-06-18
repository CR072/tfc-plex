const indexjs = require("../../index.js");
const ejs = require("ejs");
const express = require("express");
const fetch = require("node-fetch");
const settings = require("../../settings.json");


module.exports.load = async function(app, db) {
  app.use('/assets', express.static('./assets'));
  app.all("/", async (req, res) => {
    if (req.session.pterodactyl && req.session.pterodactyl.id !== await db.get(`users-${req.session.userinfo.id}`)) 
        return res.redirect("/login?prompt=none");
    
    let theme = indexjs.get(req);
    if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname) && (!req.session.userinfo || !req.session.pterodactyl)) 
        return res.redirect("/login");
  
    if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
        const renderPage = async (err, str) => {
            delete req.session.newaccount;
            if (!req.session.userinfo || !req.session.pterodactyl || err) {
                console.log(`[WEBSITE] An error has occurred on path ${req._parsedUrl.pathname}:`);
                console.log(err);
                return res.render("404.ejs", { err });
            }
            let cacheAccount = await fetch(
                `${settings.pterodactyl.domain}/api/application/users/${(await db.get(`users-${req.session.userinfo.id}`))}?include=servers`,
                {
                    method: "GET",
                    headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
                }
            );
            if (await cacheAccount.statusText == "Not Found") {
                return res.send(str);
            }
            let cacheAccountInfo = JSON.parse(await cacheAccount.text());
            req.session.pterodactyl = cacheAccountInfo.attributes;
            if (cacheAccountInfo.attributes.root_admin !== true) {
                return res.send(str);
            }
            ejs.renderFile(
                `./themes/${theme.name}/${theme.settings.index}`, 
                await indexjs.renderdataeval(req),
                null,
                (err, str) => {
                    if (err) {
                        console.log(`[WEBSITE] An error has occurred on path ${req._parsedUrl.pathname}:`);
                        console.log(err);
                        return res.render("404.ejs", { err });
                    }
                    delete req.session.newaccount;
                    res.send(str);
                }
            );
        };
        ejs.renderFile(
            `./themes/${theme.name}/${theme.settings.notfound}`, 
            await indexjs.renderdataeval(req),
            null,
            renderPage
        );
        return;
    }
    ejs.renderFile(
        `./themes/${theme.name}/${theme.settings.index}`, 
        await indexjs.renderdataeval(req),
        null,
        (err, str) => {
            if (err) {
                console.log(`[WEBSITE] An error has occurred on path ${req._parsedUrl.pathname}:`);
                console.log(err);
                return res.render("404.ejs", { err });
            }
            delete req.session.newaccount;
            res.send(str);
        }
    );
  });

  app.use('/assets', express.static('./assets'));
  app.use('/cdn', express.static('./cdn'));
};
