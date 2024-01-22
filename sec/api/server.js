const settings = require("../settings");
const fetch = require('node-fetch');
const express = require('express');
const app = express();

// Middleware zur Überprüfung, ob der Benutzer ein Administrator ist
const isAdminMiddleware = (req, res, next) => {
  // Überprüfen Sie, ob der Benutzer ein Administrator ist
  // Hier können Sie Ihre eigene Logik implementieren, um den Administratorstatus zu überprüfen
  // In Ihrem Beispiel verwenden Sie req.session.pterodactyl.root_admin, um den Administratorstatus zu überprüfen

  if (req.session.pterodactyl && req.session.pterodactyl.root_admin === true) {
    // Der Benutzer ist ein Administrator, fahren Sie fort
    next();
  } else {
    // Der Benutzer ist kein Administrator, leiten Sie ihn um oder senden Sie eine Fehlermeldung
    res.status(403).json({ error: 'Permission denied' });
  }
};

module.exports.load = async function (app, db) {
  // Fügen Sie das isAdminMiddleware direkt vor die spezifischen Routen hinzu

  // Beispiel: Alle Server abrufen
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
        // Weitere Daten nach Bedarf hinzufügen
      }));

      res.json({ servers: servers });
    } catch (error) {
      console.error(`Error while fetching servers: ${error}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Weitere Routen für Server hinzufügen, falls erforderlich

};
