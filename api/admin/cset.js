/*
 * APPENDIX FOR LEGAL PURPOSES *
   Copyright (c) 2024, privt00
   Copyright (c) 2024, CR072 and the HolaClient project

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

 *--------------------------------------------------------------------------
 *   _    _       _        _____ _ _            _   
 * | |  | |     | |      / ____| (_)          | |  
 * | |__| | ___ | | __ _| |    | |_  ___ _ __ | |_ 
 * |  __  |/ _ \| |/ _` | |    | | |/ _ \ '_ \| __|
 * | |  | | (_) | | (_| | |____| | |  __/ | | | |_ 
 * |_|  |_|\___/|_|\__,_|\_____|_|_|\___|_| |_|\__|
 *--------------------------------------------------------------------------
 *
 * @author CR072 <crazymath072@holaclient.tech>
 * @license Apache-2.0
 * 
 * https://holaclient.tech
 * 
 * © 2022-2024 HolaClient
*/

const fs = require("fs");

module.exports.load = async function (app, db) {
  app.post("/update-brand", (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/auth");
    try {
      const nameValue = req.body.name;
      const logoValue = req.body.logo;
      const settingsFilePath = "settings.json";
      const settings = JSON.parse(fs.readFileSync(settingsFilePath));

      settings.name = nameValue;
      settings.logo.url = logoValue;

      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));

      res.send("Setting updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).send("Failed to update settings");
    }
  });
  app.post("/update-pterodactyl", (req, res) => {
    try {
      const domain = req.body.domain;
      const key = req.body.key;

      const settingsFilePath = "settings.json";
      const settings = JSON.parse(fs.readFileSync(settingsFilePath));

      settings.pterodactyl.domain = domain;
      settings.pterodactyl.key = key;

      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));

      res.send("Setting updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).send("Failed to update settings");
    }
  });
};
