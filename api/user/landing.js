const settings = require("../../settings");
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

    if (!response.ok) throw new Error(`Failed to fetch ${errorMessage}: ${response.status} ${response.statusText}`);

    return await response.json();
  } catch (error) {
    console.error(`Error while fetching ${errorMessage}: ${error}`);
    throw new Error(`Internal Server Error: ${errorMessage}`);
  }
};

const handleRequest = async (req, res, endpoint, resultKey, handler) => {
  try {
    const json = await fetchData(endpoint, resultKey);
    if (handler) await handler(json, req, res);
    else res.json({ [resultKey]: json.meta.pagination.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




module.exports.load = async (app, db) => {

  const routes = [
    { path: "/api/users", endpoint: "users", resultKey: "totalUsers" },
    { path: "/api/nodes", endpoint: "nodes", resultKey: "totalNodes" },
    { path: "/api/locations", endpoint: "locations", resultKey: "totalLocations" },
    {
      path: "/api/servers",
      endpoint: "nodes?include=servers",
      resultKey: "totalServers",
      handler: async (json, req, res) => {
        const totalServers = json.data.reduce((acc, node) => acc + (node.attributes.relationships.servers?.data?.length || 0), 0);
        res.json({ totalServers });
      }
    }
  ];

  routes.forEach(({ path, endpoint, resultKey, handler }) => {
    app.get(path, async (req, res) => {
      await handleRequest(req, res, endpoint, resultKey, handler);
    });
  });
};
