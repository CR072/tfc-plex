const settings = require("../../settings.json");
const fs = require('fs');
const indexjs = require("../../index.js");
module.exports.load = async function(app, db) {
    app.get("/referal/code", async (req, res) => {
      if (!req.session.pterodactyl) return res.redirect("/");
      let theme = indexjs.get(req);
      let failredirect = theme.settings.redirect.alreadyreffered
      let referid = req.query.referid 
      let userid = req.session.pterodactyl.username
      let reffered = await db.get("referred-" + userid)
      if (!referid || !userid) return res.redirect('/refarl?INVALIDDETAILS')
      if (reffered == true) return res.redirect('/refarl?ALREADYREFFERED')
      let ridusr = await db.get("referuserid-" + referid)
if (!ridusr || !ridusr.userid) {
    return res.redirect('/refarl?INVALIDDETAILS');
}
      let usr1coin = await db.get("coins-" + userid) ?? 0
      let oldcoinsusr1 = parseFloat(usr1coin);
      let newcoinsusr1 = oldcoinsusr1 + settings.referral.coinsPerReferral;
      let ee = await db.set("coins-" + userid, newcoinsusr1)
      let eee = await db.set("referred-" + userid, true)

      let usr2coin = await db.get("coins-" + ridusr.userid) ?? 0
      let oldcoinsusr2 = parseFloat(usr2coin);
      let newcoinsusr2 = oldcoinsusr2 + 50;
      let e = await db.set("coins-" + ridusr.userid, newcoinsusr2)

      let successredirect = "theme.settings.redirect.referred"
      res.redirect('/refarl?REFERRED')
    });

    app.get("/api/referal/update", async (req, res) => {
      let newid = req.query.referid
      let userid = req.session.userid
      let currentid = req.query.currentid
      let theme = indexjs.get(req);
      let failredirect = theme.settings.redirect.invalidreferupdatedetails
      if (!newid || !userid || !currentid) return res.redirect('/refarl?err=INVALIDDETAILS')
      let referidcheck = await db.get("referuserid-" + newid) ?? false
      if (referidcheck.inuse == true) return res.send("already in use")
      await db.delete("referuserid-" + currentid)
      const referid = {
        userid: userid,
        inuse: true
      }
      await db.set("referuserid-" + newid, referid)
      await db.set("referiduser-" + userid, newid)

      let successredirect = theme.settings.redirect.updatedreferid
      res.redirect("/refarl?success=UPDATEDREFERID")
    })
  };