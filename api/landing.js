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

const handleRequest = async (req, res, endpoint, resultKey) => {
  try {
    const json = await fetchData(endpoint, resultKey);
    res.json({ [resultKey]: json.meta.pagination.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.load = async function (app, db) {
  app.get("/api/users", async (req, res) => {
    await handleRequest(req, res, "users", "totalUsers");
  });

  app.get("/api/nodes", async (req, res) => {
    await handleRequest(req, res, "nodes", "totalNodes");
  });

  app.get("/api/locations", async (req, res) => {
    await handleRequest(req, res, "locations", "totalLocations");
  });

  app.get("/api/servers", async (req, res) => {
    try {
      const json = await fetchData("nodes?include=servers", "nodes and servers");

      const totalServers = json.data.reduce((acc, node) => {
        return acc + (node.attributes.relationships.servers?.data?.length || 0);
      }, 0);

      res.json({ totalServers });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
