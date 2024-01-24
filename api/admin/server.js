const settings = require("../../settings");
const fetch = require('node-fetch');
const express = require('express');
const app = express();
const isAdminMiddleware = (req, res, next) => {


  if (req.session.pterodactyl && req.session.pterodactyl.root_admin === true) {
    next();
  } else {
    res.status(403).json({ error: 'Permission denied' });
  }
};

module.exports.load = async function (app, db) {
  app.get("/api/server", isAdminMiddleware, async (req, res) => {
    try {
      const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.pterodactyl.key}`
        }
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch servers: ${response.status} ${response.statusText} - ${errorMessage}`);
      }

      const json = await response.json();
      const servers = json.data.map(server => ({
        id: server.attributes.id,
        name: server.attributes.name,
      }));

      res.json({ servers: servers });
    } catch (error) {
      console.error(`Error while fetching servers: ${error}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
};