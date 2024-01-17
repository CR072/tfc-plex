const indexjs = require("../index.js");
const fs = require("fs");
const moment = require("moment");

// Store the last claimed timestamp for each user
const lastClaimed = {};

module.exports.load = async function (app, db) {
    // Route to display the user's gift count and the large gift
    app.get("/christmas/gifts", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");

        let theme = indexjs.get(req);

        // Retrieve the user's current gifts count from the database
        let gifts = await db.get("gifts-" + req.session.userinfo.id) || 0;

        // Render the gifts count page with the large gift
        res.render(`../themes/${theme.name}/christmas.ejs`, { gifts: gifts });
    });

    // Route to claim a new gift after human verification
    app.get("/claim-gift", async (req, res) => {
        // Check if the user is logged in
        if (!req.session.pterodactyl) {
            // Redirect to the login page if not logged in
            return res.redirect("/login");
        }

        // Perform additional checks if needed before allowing the gift claim
        // E.g., check if the user completed the human verification challenge

        // Check the last claimed timestamp for the user
        const lastClaimTimestamp = lastClaimed[req.session.userinfo.id] || 0;
        const currentTime = moment().unix();

        // Check if enough time has passed since the last claim (20 minutes = 1200 seconds)
        if (currentTime - lastClaimTimestamp < 1200) {
            // Respond with an error message or redirect to another page
            return res.redirect(`/dashboard?alert=gifttoosoon`);
        }

        // Award gifts for the claim
        let giftsPerClaim = 1; // You mentioned 1 gift per claim
        let gifts = await db.get("gifts-" + req.session.userinfo.id) || 0;
        gifts = gifts + giftsPerClaim;
        await db.set("gifts-" + req.session.userinfo.id, gifts);

        // Update the last claimed timestamp for the user
        lastClaimed[req.session.userinfo.id] = currentTime;

        // Respond with a message or redirect to another page
        return res.redirect(`/dashboard?alert=gift`);
    });
};
