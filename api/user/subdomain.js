const fs = require("fs");
const indexjs = require("../../index.js");
const settings = require("../../settings.json");
const fetch = require('node-fetch');

const { email, api_key, zone_id } = settings.cloudflare;
const cloudflareAuth = {
    'X-Auth-Email': email,
    'Authorization': `Bearer ${api_key}`
};

const fetchFromCloudflare = async (url, method = 'GET', body = null) => {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json', ...cloudflareAuth },
        body: body ? JSON.stringify(body) : null
    };

    const response = await fetch(url, options);
    const data = await response.json();
    return { response, data };
};

module.exports.load = async function (app, db) {
    const handleCloudflareError = (action, data) => {
        console.error(`Oops! Something went wrong while ${action}:`, data.errors);
        return { success: false, error: data.errors };
    };

    app.get('/domain', async (req, res) => {
        try {
            const { response, data } = await fetchFromCloudflare(`https://api.cloudflare.com/client/v4/zones/${zone_id}`);
            return response.ok ? res.status(200).json({ domain: data.result.name }) : res.status(500).json(handleCloudflareError('fetching the domain', data));
        } catch (error) {
            console.error('Oops! Something went wrong while fetching the domain:', error);
            res.status(500).json({ error: 'Failed to fetch domain' });
        }
    });

    app.get('/subdomains', async (req, res) => {
        try {
            const { response, data } = await fetchFromCloudflare(`https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`);
            return response.ok ? res.status(200).json({ data }) : res.status(500).json(handleCloudflareError('fetching subdomains', data));
        } catch (error) {
            console.error('Oops! Something went wrong while fetching subdomains:', error);
            res.status(500).json({ error: 'Failed to fetch subdomains' });
        }
    });

    app.post('/subdomain/create', async (req, res) => {
        try {
            const { subdomain, target, port } = req.body;
            const { response, data } = await fetchFromCloudflare(`https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`, 'POST', {
                "type": "SRV",
                "data": { "service": "_minecraft", "proto": "_tcp", "name": subdomain, "priority": 0, "weight": 0, "port": port, "target": target }
            });

            return (response.ok && data.success) ?
                (console.log(`Congratulations! ${req.session.userinfo.username} has created a new subdomain: ${data.result.data.name}`),
                    res.status(200).json({ success: true, domain: data.result.data.name })) :
                res.status(500).json(handleCloudflareError('creating subdomain', data));
        } catch (error) {
            console.error('Oops! Something went wrong while creating subdomain:', error);
            res.status(500).json({ success: false, error: 'Failed to create subdomain' });
        }
    });
};
