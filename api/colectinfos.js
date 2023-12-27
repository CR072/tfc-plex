const moment = require("moment");

module.exports.load = async function (app, db) {
    app.get("/moreinfo/:birthday/:nickname", async (req, res) => {
        // Überprüfen Sie, ob der Benutzer eine gültige Sitzung hat. Falls nicht, auf "/login" umleiten.
        if (!req.session.pterodactyl) return res.redirect("/login");

        // Überprüfen Sie, ob bereits Geburtstag und Nickname gespeichert sind.
        let userInfo = await db.get("userinfo-" + req.session.userinfo.id) || {};
        if (userInfo.birthday && userInfo.nickname) {
            return res.send(`Birthday and nickname are already set. <a href='/dashboard'>Go back to dashboard</a>`);
        }

        // Extrahieren Sie Geburtstag und Nickname aus der URL und speichern Sie sie in der Datenbank.
        const { birthday, nickname } = req.params;

        // Überprüfen Sie, ob das Datumsformat korrekt ist (optional, abhängig von den Anforderungen)
        if (!moment(birthday, "YYYY-MM-DD", true).isValid()) {
            return res.send("Invalid birthday format. Please use YYYY-MM-DD.");
        }

        userInfo.birthday = birthday;
        userInfo.nickname = nickname;
        await db.set("userinfo-" + req.session.userinfo.id, userInfo);

        // Nach dem Speichern zum Dashboard umleiten.
        return res.redirect("/dashboard");
    });




};
