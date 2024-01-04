const fs = require("fs");
const indexjs = require("../index.js");
const settings = require("../settings.json");
const fetch = require('node-fetch');

const { email: cloudflareEmail, api_key: cloudflareAPIKey, zone_id: cloudflareZoneID } = settings.cloudflare;

module.exports.load = async function (app, db) {
    app.get('/domain', async (req, res) => {
        try {
            const url = `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneID}`;
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Email': cloudflareEmail,
                    'Authorization': `Bearer ${cloudflareAPIKey}`
                }
            };

            const response = await fetch(url, options);
            const data = await response.json();

            if (response.ok) {
                const domain = data.result.name;
                res.status(200).json({ domain });
            } else {
                console.error('Oops! Something went wrong while fetching the domain:', data.errors);
                res.status(500).json({ error: 'Failed to fetch domain' });
            }
        } catch (error) {
            console.error('Oops! Something went wrong while fetching the domain:', error);
            res.status(500).json({ error: 'Failed to fetch domain' });
        }
    });

    app.get('/subdomains', async (req, res) => {
        try {
            const url = `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneID}/dns_records`;
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Email': cloudflareEmail,
                    'Authorization': `Bearer ${cloudflareAPIKey}`
                }
            };

            const response = await fetch(url, options);
            const data = await response.json();

            if (response.ok) {
                res.status(200).json({ data });
            } else {
                console.error('Oops! Something went wrong while fetching subdomains:', data.errors);
                res.status(500).json({ error: 'Failed to fetch subdomains' });
            }
        } catch (error) {
            console.error('Oops! Something went wrong while fetching subdomains:', error);
            res.status(500).json({ error: 'Failed to fetch subdomains' });
        }
    });

    app.post('/subdomain/create', async (req, res) => {
        try {
            const { subdomain, target, port } = req.body;
            const url = `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneID}/dns_records`;
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Email': cloudflareEmail,
                    'Authorization': `Bearer ${cloudflareAPIKey}`
                },
                body: JSON.stringify({
                    "type": "SRV",
                    "data": {
                        "service": "_minecraft",
                        "proto": "_tcp",
                        "name": subdomain,
                        "priority": 0,
                        "weight": 0,
                        "port": port,
                        "target": target
                    }
                })
            };

            const response = await fetch(url, options);
            const data = await response.json();

            if (response.ok && data.success) {
                res.status(200).json({ success: true, domain: data.result.data.name });
                console.log(`Congratulations! ${req.session.userinfo.username} has created a new subdomain: ${data.result.data.name}`);
            } else {
                console.error('Oops! Something went wrong while creating subdomain:', data.errors);
                res.status(500).json({ success: false, error: data.errors });
            }
        } catch (error) {
            console.error('Oops! Something went wrong while creating subdomain:', error);
            res.status(500).json({ success: false, error: 'Failed to create subdomain' });
        }
    });
};
