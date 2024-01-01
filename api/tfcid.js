module.exports.load = async function (app, db) {
    app.get("/users/id/get/tfcid/:dcid", async (req, res) => {
        try {
            const dcid = req.params.dcid;
            if (!dcid) {
                return res.json({ "success": false, "message": "MISSINGUSER" });
            }

            let tfcid = await db.get("tfcid-" + dcid);

            if (!tfcid) {
                // Wenn tfcid nicht vorhanden ist, generiere eine zufällige Zahl zwischen 1 und 100
                tfcid = Math.floor(Math.random() * 100) + 1;

                // Speichere die generierte tfcid in der Datenbank
                await db.set("tfcid-" + dcid, tfcid);
            }

            res.json({ "success": true, "message": "", "id": tfcid });
        } catch (error) {
            console.error('Fehler beim Ändern von DCId zu tfcid', error);
            res.json({ "success": false, "message": "Ein Fehler ist aufgetreten." });
        }
    });
}
