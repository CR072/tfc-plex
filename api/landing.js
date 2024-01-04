const settings = require("../settings");
const fetch = require('node-fetch');

const fetchData = async (endpoint, errorMessage) => {
  try {
    const response = await fetch(`${settings.pterodactyl.domain}/api/application/${endpoint}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.pterodactyl.key}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${errorMessage}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error while fetching ${errorMessage}: ${error}`);
    throw new Error(`Internal Server Error: ${errorMessage}`);
  }
};

module.exports.load = async function(app, db) {
  app.get("/api/users", async (req, res) => {
    try {
      const json = await fetchData("users", "users");
      res.json({ totalUsers: json.meta.pagination.total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/nodes", async (req, res) => {
    try {
      const json = await fetchData("nodes", "nodes");
      res.json({ totalNodes: json.meta.pagination.total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/locations", async (req, res) => {
    try {
      const json = await fetchData("locations", "locations");
      res.json({ totalLocations: json.meta.pagination.total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/servers", async (req, res) => {
    try {
      const json = await fetchData("nodes?include=servers", "nodes and servers");

      let totalServers = 0;
      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((node) => {
          if (node.attributes.relationships.servers && Array.isArray(node.attributes.relationships.servers.data)) {
            totalServers += node.attributes.relationships.servers.data.length;
          }
        });
      }

      res.json({ totalServers });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
