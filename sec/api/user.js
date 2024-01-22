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
  // Fügen Sie die isAdminMiddleware direkt vor die spezifische Route hinzu
  app.get("/api/user", isAdminMiddleware, async (req, res) => {
    try {
      let allUsers = [];

      let page = 1;
      let totalPages = 1; // Annahme: mindestens eine Seite vorhanden

      while (page <= totalPages) {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/users?page=${page}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        });

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorMessage}`);
        }

        const json = await response.json();
        const usersOnPage = json.data.map(user => ({
          id: user.attributes.id,
          username: user.attributes.username,
          firstName: user.attributes.first_name,
          lastName: user.attributes.last_name,
          email: user.attributes.email,
          // Weitere Daten nach Bedarf hinzufügen
        }));

        allUsers = allUsers.concat(usersOnPage);
        totalPages = json.meta.pagination.total_pages;

        page++;
      }

      res.json({ users: allUsers });
    } catch (error) {
      console.error(`Error while fetching users: ${error}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  
  app.delete("/api/user/delete/:id", isAdminMiddleware, async (req, res) => {
    try {
      const userId = req.params.id;

      const response = await fetch(`${settings.pterodactyl.domain}/api/application/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.pterodactyl.key}`
        }
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error(`Failed to delete user: ${response.status} ${response.statusText} - ${errorMessage}`);
        return res.status(response.status).json({ error: "Failed to delete user" });
      }

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error(`Error while deleting user: ${error}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  app.get("/api/user/search", isAdminMiddleware, async (req, res) => {
    try {
      const searchTerm = req.query.term.toLowerCase();
  
      const response = await fetch(`${settings.pterodactyl.domain}/api/application/users`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.pterodactyl.key}`
        }
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorMessage}`);
      }
  
      const json = await response.json();
      const users = json.data.map(user => ({
        id: user.attributes.id,
        username: user.attributes.username,
        firstName: user.attributes.first_name,
        lastName: user.attributes.last_name,
        email: user.attributes.email,
      }));
  
      const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm)
      );
  
      res.json({ users: filteredUsers });
    } catch (error) {
      console.error(`Error while searching users: ${error}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  
};
