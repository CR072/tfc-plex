const moment = require("moment");

module.exports.load = async function (app, db) {
    app.get("/moreinfo/:birthday/:nickname", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");
        let userInfo = await db.get("userinfo-" + req.session.userinfo.id) || {};
        if (userInfo.birthday && userInfo.nickname) {
            return res.send(`Birthday and nickname are already set. <a href='/dashboard'>Go back to dashboard</a>`);
        }
        const { birthday, nickname } = req.params;
        if (!moment(birthday, "YYYY-MM-DD", true).isValid()) {
            return res.send("Invalid birthday format. Please use YYYY-MM-DD.");
        }

        userInfo.birthday = birthday;
        userInfo.nickname = nickname;
        await db.set("userinfo-" + req.session.userinfo.id, userInfo);
        return res.redirect("/dashboard");
    });




};
