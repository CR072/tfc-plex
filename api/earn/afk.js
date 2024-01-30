const moment = require("moment");
const settings = require("../../settings");

module.exports.load = async function (app, db) {
    // Use an object to store user-specific cooldown timestamps
    const cooldownMap = {};

    app.get("/earn-coins", async (req, res) => {
        const userId = req.query.userId;

        // Check if the user is still in cooldown
        const cooldownTime = cooldownMap[userId] || moment(0);
        const currentTime = moment();
        const cooldownDifference = currentTime.diff(cooldownTime, 'seconds');

        if (cooldownDifference < 60) {
            res.json({ coins: await db.get("coins-" + userId) || 0 });
            return;
        }

        // Add coins at the end of the cooldown
        let coins = await db.get("coins-" + userId) || 0;
        coins = coins + settings.afk.coins;
        await db.set("coins-" + userId, coins);

        // Set the new cooldown timestamp
        cooldownMap[userId] = moment();

        res.json({ coins: coins });
    });
};
