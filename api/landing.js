const settings = require("../settings");
const fetch = require('node-fetch');

const getCommonHeaders = () => {
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${settings.pterodactyl.key}`
  };
};

const fetchData = async (endpoint, errorMessage) => {
  try {
    const response = await fetch(`${settings.pterodactyl.domain}/api/application/${endpoint}`, {
      method: "GET",
      headers: getCommonHeaders()
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
  const endpoints = [
    { path: "users", errorMessage: "users" },
    { path: "nodes", errorMessage: "nodes" },
    { path: "locations", errorMessage: "locations" },
    { path: "nodes?include=servers", errorMessage: "nodes and servers" }
  ];

  endpoints.forEach(({ path, errorMessage }) => {
    app.get(`/api/${path}`, async (req, res) => {
      try {
        const json = await fetchData(path, errorMessage);

        let total = 0;
        if (path === "nodes?include=servers" && json.data && Array.isArray(json.data)) {
          json.data.forEach((node) => {
            if (node.attributes.relationships.servers && Array.isArray(node.attributes.relationships.servers.data)) {
              total += node.attributes.relationships.servers.data.length;
            }
          });
        } else if (json.meta && json.meta.pagination) {
          total = json.meta.pagination.total;
        }

        res.json({ total });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });
};
