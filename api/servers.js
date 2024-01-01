const settings = require("../settings.json");
const fetch = require('node-fetch');
const indexjs = require("../index.js");
const adminjs = require("./admin.js");
const fs = require("fs");
const getPteroUser = require('../misc/getPteroUser')
const Queue = require('../managers/Queue')
const log = require('../misc/log')
const axios = require('axios');

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
  if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function (app, db) {
  app.get("/updateinfo", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
      .catch(() => {
        return res.send("An error has occured while attempting to update your account information and server list.");
      })
    if (!cacheaccount) return
    req.session.pterodactyl = cacheaccount.attributes;
    if (req.query.redirect) if (typeof req.query.redirect == "string") return res.redirect("/" + req.query.redirect);
    res.redirect("/servers");
  });

  const queue = new Queue()
  app.get("/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.create == true) {
      queue.addJob(async (cb) => {
        let redirectlink = theme.settings.redirect.failedcreateserver ?? "/"; // fail redirect link

        const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
          .catch(() => {
            cb()
            return res.send("An error has occured while attempting to update your account information and server list.");
          })
        if (!cacheaccount) {
          cb()
          return
        }
        req.session.pterodactyl = cacheaccount.attributes;

        if (req.query.name && req.query.ram && req.query.disk && req.query.cpu && req.query.egg && req.query.location) {
          try {
            decodeURIComponent(req.query.name)
          } catch (err) {
            cb()
            return res.redirect(`${redirectlink}?err=COULDNOTDECODENAME`);
          }

          let packagename = await db.get("package-" + req.session.userinfo.id);
          let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

          let extra =
            await db.get("extra-" + req.session.userinfo.id) ||
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };

          let ram2 = 0;
          let disk2 = 0;
          let cpu2 = 0;
          let servers2 = req.session.pterodactyl.relationships.servers.data.length;
          for (let i = 0, len = req.session.pterodactyl.relationships.servers.data.length; i < len; i++) {
            ram2 = ram2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.memory;
            disk2 = disk2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.disk;
            cpu2 = cpu2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.cpu;
          };

          if (servers2 >= package.servers + extra.servers) return res.redirect(`${redirectlink}?err=TOOMUCHSERVERS`);

          let name = decodeURIComponent(req.query.name);
          if (name.length < 1) { 
            cb()
            return res.redirect(`${redirectlink}?err=LITTLESERVERNAME`);
          }
          if (name.length > 191) {
            cb()
            return res.redirect(`${redirectlink}?err=BIGSERVERNAME`);
          }

          let location = req.query.location;

          if (Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location).length !== 1) {
            cb()
            return res.redirect(`${redirectlink}?err=INVALIDLOCATION`);
          }

          let requiredpackage = Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location)[0][1].package;
          if (requiredpackage) if (!requiredpackage.includes(packagename ? packagename : newsettings.api.client.packages.default)) {
            cb()
            return res.redirect(`${redirectlink}?err=PREMIUMLOCATION`);
          }


          let egg = req.query.egg;

          let egginfo = newsettings.api.client.eggs[egg];
          if (!newsettings.api.client.eggs[egg]) {
            cb()
            return res.redirect(`${redirectlink}?err=INVALIDEGG`);
          }
          let ram = parseFloat(req.query.ram);
          let disk = parseFloat(req.query.disk);
          let cpu = parseFloat(req.query.cpu);
          if (!isNaN(ram) && !isNaN(disk) && !isNaN(cpu)) {
            if (ram2 + ram > package.ram + extra.ram) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDRAM&num=${package.ram + extra.ram - ram2}`);
            }
            if (disk2 + disk > package.disk + extra.disk) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDDISK&num=${package.disk + extra.disk - disk2}`);
            }
            if (cpu2 + cpu > package.cpu + extra.cpu) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`);
            }
            if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
            }
            if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
            }
            if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
            }
            if (egginfo.maximum) {
              if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
              }
              if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
              }
              if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`)
              }
            }

            let specs = egginfo.info;
            specs["user"] = (await db.get("users-" + req.session.userinfo.id));
            if (!specs["limits"]) specs["limits"] = {
              swap: 0,
              io: 500,
              backups: 0
            };
            specs.name = name;
            specs.limits.memory = ram;
            specs.limits.disk = disk;
            specs.limits.cpu = cpu;
            if (!specs["deploy"]) specs.deploy = {
              locations: [],
              dedicated_ip: false,
              port_range: []
            }
            specs.deploy.locations = [location];

            let serverinfo = await fetch(
              settings.pterodactyl.domain + "/api/application/servers",
              {
                method: "post",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
                body: JSON.stringify(await specs)
              }
            );
            await serverinfo
            if (serverinfo.statusText !== "Created") {
              console.log(await serverinfo.text());
              cb()
              return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
            }
            let serverinfotext = await serverinfo.json();
            let newpterodactylinfo = req.session.pterodactyl;
            newpterodactylinfo.relationships.servers.data.push(serverinfotext);
            req.session.pterodactyl = newpterodactylinfo;

            await db.set(`lastrenewal-${serverinfotext.attributes.id}`, Date.now())
            await db.set(`createdserver-${req.session.userinfo.id}`, true)

            cb()
            log('created server', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} created a new server named \`${name}\` with the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``)
            return res.redirect(theme.settings.redirect.createserver ? theme.settings.redirect.createserver : "/dashboard");
          } else {
            cb()
            res.redirect(`${redirectlink}?err=NOTANUMBER`);
          }
        } else {
          cb()
          res.redirect(`${redirectlink}?err=MISSINGVARIABLE`);
        }
      })
    } else {
      res.redirect(theme.settings.redirect.createserverdisabled ? theme.settings.redirect.createserverdisabled : "/");
    }
  });

  app.get("/modify", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.modify == true) {
      if (!req.query.id) return res.send("Missing server id.");

      const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
        .catch(() => {
          return res.send("An error has occured while attempting to update your account information and server list.");
        })
      if (!cacheaccount) return
      req.session.pterodactyl = cacheaccount.attributes;

      let redirectlink = theme.settings.redirect.failedmodifyserver ? theme.settings.redirect.failedmodifyserver : "/"; // fail redirect link

      let checkexist = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id == req.query.id);
      if (checkexist.length !== 1) return res.send("Invalid server id.");

      let ram = req.query.ram ? (isNaN(parseFloat(req.query.ram)) ? undefined : parseFloat(req.query.ram)) : undefined;
      let disk = req.query.disk ? (isNaN(parseFloat(req.query.disk)) ? undefined : parseFloat(req.query.disk)) : undefined;
      let cpu = req.query.cpu ? (isNaN(parseFloat(req.query.cpu)) ? undefined : parseFloat(req.query.cpu)) : undefined;

      if (ram || disk || cpu) {
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

        let packagename = await db.get("package-" + req.session.userinfo.id);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

        let pterorelationshipsserverdata = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id.toString() !== req.query.id);

        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        for (let i = 0, len = pterorelationshipsserverdata.length; i < len; i++) {
          ram2 = ram2 + pterorelationshipsserverdata[i].attributes.limits.memory;
          disk2 = disk2 + pterorelationshipsserverdata[i].attributes.limits.disk;
          cpu2 = cpu2 + pterorelationshipsserverdata[i].attributes.limits.cpu;
        }
        let attemptegg = null;
        //let attemptname = null;

        for (let [name, value] of Object.entries(newsettings.api.client.eggs)) {
          if (value.info.egg == checkexist[0].attributes.egg) {
            attemptegg = newsettings.api.client.eggs[name];
            //attemptname = name;
          };
        };
        let egginfo = attemptegg ? attemptegg : null;

        if (!egginfo) return res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGEGG`);

        let extra =
          await db.get("extra-" + req.session.userinfo.id) ?
            await db.get("extra-" + req.session.userinfo.id) :
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };

        if (ram2 + ram > package.ram + extra.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${package.ram + extra.ram - ram2}`);
        if (disk2 + disk > package.disk + extra.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${package.disk + extra.disk - disk2}`);
        if (cpu2 + cpu > package.cpu + extra.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`);
        if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
        if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
        if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
        if (egginfo.maximum) {
          if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
          if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
          if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`);
        };

        let limits = {
          memory: ram ? ram : checkexist[0].attributes.limits.memory,
          disk: disk ? disk : checkexist[0].attributes.limits.disk,
          cpu: cpu ? cpu : checkexist[0].attributes.limits.cpu,
          swap: egginfo ? checkexist[0].attributes.limits.swap : 0,
          io: egginfo ? checkexist[0].attributes.limits.io : 500
        };

        let serverinfo = await fetch(
          settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/build",
          {
            method: "patch",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
            body: JSON.stringify({
              limits: limits,
              feature_limits: checkexist[0].attributes.feature_limits,
              allocation: checkexist[0].attributes.allocation
            })
          }
        );
        if (await serverinfo.statusText !== "OK") return res.redirect(`${redirectlink}?id=${req.query.id}&err=ERRORONMODIFY`);
        let text = JSON.parse(await serverinfo.text());
        log(`modify server`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} modified the server called \`${text.attributes.name}\` to have the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``)
        pterorelationshipsserverdata.push(text);
        req.session.pterodactyl.relationships.servers.data = pterorelationshipsserverdata;
        let theme = indexjs.get(req);
        adminjs.suspend(req.session.userinfo.id);
        res.redirect(theme.settings.redirect.modifyserver ? theme.settings.redirect.modifyserver : "/dashboard");
      } else {
        res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(theme.settings.redirect.modifyserverdisabled ? theme.settings.redirect.modifyserverdisabled : "/");
    }
  });

  app.get("/delete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("Failed to delete the server. Change the url to /forcedelete instead of /delete if you'd like to force delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect(theme.settings.redirect.deleteserver ? theme.settings.redirect.deleteserver : "/");
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });







  // control Feature



  const PTERO_API_URL = settings.pterodactyl.domain;

  app.get('/control', async (req, res) => {
    const serverId = req.query.id;
    const action = req.query.action;

    if (!serverId || !action) {
      return res.status(400).send('Ungültige Anfrage. Stelle sicher, dass du "id" und "action" in der URL angibst.');
    }

    try {
      // Hier musst du deine Pterodactyl API-Zugangsdaten angeben
      const apiKey = settings.pterodactyl.account_key; // Ersetze dies durch deinen Pterodactyl API-Schlüssel
      const apiUrl = `${PTERO_API_URL}/api/client/servers/${serverId}/power`;

      // Verwende die entsprechende Aktion für die Pterodactyl API
      const apiAction = action === 'start' ? 'start' : 'stop';

      const response = await axios.post(apiUrl, {
        signal: apiAction,
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      res.send(`Server ${serverId} ${apiAction === 'start' ? 'gestartet' : 'gestoppt'}.`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Interner Serverfehler.');
    }
  });









  const { pterosocket } = require('pterosocket');
  const express = require('express');
  app.use(express.json());

  app.get('/wss', (req, res) => {
    const server_idnum = req.query.id; // Extrahiere die Server-ID aus der Query-Parameter

    if (!server_idnum) {
      return res.status(400).send('Server-ID fehlt in der Anfrage.');
    }

    const origintzui = settings.pterodactyl.domain;
    const apppkey = settings.pterodactyl.account_key;

    const socket = new pterosocket(origintzui, apppkey, server_idnum);

    socket.on("start", () => {

    });

    let responseSent = false;

    const consoleOutputHandler = (output) => {
      if (!responseSent) {
        res.send(output);
        responseSent = true;
      }
    };

    socket.once('console_output', consoleOutputHandler);

    setTimeout(() => {
      if (!responseSent) {
        res.send('Keine Konsolenausgabe erhalten.');
        responseSent = true;
      }
    }, 5000);
  });














  app.get("/api/info", async (req, res) => {
    // Check if the user is logged in
    if (!req.session.pterodactyl) {
      return res.json({ error: true, message: "You must be logged in." });
    }

    try {
      // Fetch information about nodes
      const nodesResponse = await fetch(`${settings.pterodactyl.domain}/api/application/nodes`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.pterodactyl.key}`,
          'Accept': 'application/json',
        },
      });

      if (!nodesResponse.ok) {
        throw new Error(`Failed to fetch node information from Pterodactyl API. Status: ${nodesResponse.statusText}`);
      }

      const nodesData = await nodesResponse.json();

      // Extract relevant information about nodes
      const nodesInfo = nodesData.data.map(node => {
        const resources = node.attributes || {};
        const usage = node.attributes.allocated_resources || {};

        return {
          name: node.attributes.name,
          ram: {
            used: usage.memory || 0,
            free: resources.memory ? resources.memory - usage.memory : 0,
            total: resources.memory || 0,
          },
          disk: {
            used: usage.disk || 0,
            free: resources.disk_bytes ? resources.disk_bytes - usage.disk : 0,
            total: resources.disk || 0,
          },
        };
      });

      // Render the EJS template with the fetched information
      res.json({ nodes: nodesInfo });
    } catch (error) {
      console.error("Error fetching information:", error);
      return res.json({ error: true, message: "An error occurred while fetching information." });
    }
  });


















  // ... (your existing code)

  const pterodactylAPI = `${settings.pterodactyl.domain}/api/application/users`;

  app.get("/api/info/user", async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.json({ error: true, message: "You must be logged in." });
    }

    try {
      const response = await fetch(pterodactylAPI, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.pterodactyl.key}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user information from Pterodactyl API. Status: ${response.statusText}`);
      }

      const userData = await response.json();
      const numberOfUsers = userData.meta.pagination.total;

      return res.json({ numberOfUsers });
    } catch (error) {
      console.error("Error fetching user information:", error);
      return res.json({ error: true, message: "An error occurred while fetching user information." });
    }
  });

// ... (continue with the rest of your code)






  app.get("/forcedelete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/force",
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("Still cannot delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect(theme.settings.redirect.deleteserver ? theme.settings.redirect.deleteserver : "/");
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });

  app.get(`/api/createdServer`, async (req, res) => {
    if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });

    const createdServer = await db.get(`createdserver-${req.session.userinfo.id}`)
    return res.json({ created: createdServer ?? false, cost: settings.renewals.cost })
  })
};



