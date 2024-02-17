const settings = require("../../settings.json");
const fetch = require('node-fetch');
const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const fs = require("fs");
const getPteroUser = require('../../misc/getPteroUser')
const Queue = require('../../misc/Queue')
const log = require('../../misc/log')

const axios = require('axios')
if (settings.pterodactyl) if (settings.pterodactyl.domain) {
  if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};


module.exports.load = async function (app, db) {
  const ptlaUrl = settings.pterodactyl.domain;
  const ptlaApi = settings.pterodactyl.Key;
  const ptlaAcc = settings.pterodactyl.account_key;


  app.get("/updateinfo", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
      .catch(() => {
        return res.send("An error has occured while attempting to update your account information and server list.");
      })
    if (!cacheaccount) return
    req.session.pterodactyl = cacheaccount.attributes;
    if (req.query.redirect) if (typeof req.query.redirect == "string") return res.redirect("/" + req.query.redirect);
    res.redirect("/servers");
  });

  const queue = new Queue()





  app.get(`/api/createdServer`, async (req, res) => {
    if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });

    const createdServer = await db.get(`createdserver-${req.session.userinfo.id}`)
    return res.json({ created: createdServer ?? false, cost: settings.renewals.cost })
  })



  app.get("/modify", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.modify == true) {
      if (!req.query.id) return res.send("Missing server id.");

      const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
        .catch(() => {
          return res.send("An error has occured while attempting to update your account information and server list.");
        })
      if (!cacheaccount) return
      req.session.pterodactyl = cacheaccount.attributes;

      let redirectlink = theme.settings.redirect.failedmodifyserver ? theme.settings.redirect.failedmodifyserver : "/"; // fail redirect link

      let checkexist = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id == req.query.id);
      if (checkexist.length !== 1) return res.send("Invalid server id.");

      let ram = req.query.ram ? (isNaN(parseFloat(req.query.ram)) ? undefined : parseFloat(req.query.ram)) : undefined;
      let disk = req.query.disk ? (isNaN(parseFloat(req.query.disk)) ? undefined : parseFloat(req.query.disk)) : undefined;
      let cpu = req.query.cpu ? (isNaN(parseFloat(req.query.cpu)) ? undefined : parseFloat(req.query.cpu)) : undefined;

      if (ram || disk || cpu) {
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

        let packagename = await db.get("package-" + req.session.userinfo.id);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

        let pterorelationshipsserverdata = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id.toString() !== req.query.id);

        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        for (let i = 0, len = pterorelationshipsserverdata.length; i < len; i++) {
          ram2 = ram2 + pterorelationshipsserverdata[i].attributes.limits.memory;
          disk2 = disk2 + pterorelationshipsserverdata[i].attributes.limits.disk;
          cpu2 = cpu2 + pterorelationshipsserverdata[i].attributes.limits.cpu;
        }
        let attemptegg = null;

        for (let [name, value] of Object.entries(eggconfig)) {
          if (value.info.egg == checkexist[0].attributes.egg) {
            attemptegg = eggconfig[name];
          };
        };
        let egginfo = attemptegg ? attemptegg : null;

        if (!egginfo) return res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGEGG`);

        let extra =
          await db.get("extra-" + req.session.userinfo.id) ?
            await db.get("extra-" + req.session.userinfo.id) :
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };

        if (ram2 + ram > package.ram + extra.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${package.ram + extra.ram - ram2}`);
        if (disk2 + disk > package.disk + extra.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${package.disk + extra.disk - disk2}`);
        if (cpu2 + cpu > package.cpu + extra.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`);
        if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
        if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
        if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
        if (egginfo.maximum) {
          if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
          if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
          if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`);
        };

        let limits = {
          memory: ram ? ram : checkexist[0].attributes.limits.memory,
          disk: disk ? disk : checkexist[0].attributes.limits.disk,
          cpu: cpu ? cpu : checkexist[0].attributes.limits.cpu,
          swap: egginfo ? checkexist[0].attributes.limits.swap : 0,
          io: egginfo ? checkexist[0].attributes.limits.io : 500
        };

        let serverinfo = await fetch(
          settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/build",
          {
            method: "patch",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
            body: JSON.stringify({
              limits: limits,
              feature_limits: checkexist[0].attributes.feature_limits,
              allocation: checkexist[0].attributes.allocation
            })
          }
        );
        if (await serverinfo.statusText !== "OK") return res.redirect(`${redirectlink}?id=${req.query.id}&err=ERRORONMODIFY`);
        let text = JSON.parse(await serverinfo.text());
        log(`modify server`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} modified the server called \`${text.attributes.name}\` to have the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``)
        pterorelationshipsserverdata.push(text);
        req.session.pterodactyl.relationships.servers.data = pterorelationshipsserverdata;
        let theme = indexjs.get(req);
        adminjs.suspend(req.session.userinfo.id);
        res.redirect(theme.settings.redirect.modifyserver ? theme.settings.redirect.modifyserver : "/dashboard");
      } else {
        res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(theme.settings.redirect.modifyserverdisabled ? theme.settings.redirect.modifyserverdisabled : "/");
    }
  });

  app.get('/api/servers/resources/:id', async (req, res) => {
    try {
        let response = await fetch(`${ptlaUrl}/api/client/servers/${req.params.id}/resources`, {
            "method": "GET",
            "headers": {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ptlaAcc}`
            },
        });
        const data = await response.json();
        if (data && data && data.attributes) {
            const success = data.success;
            const state = data.attributes.current_state;
            res.json({ success, state, is_suspended: data.attributes.is_suspended });
        } else {
            res.json({ success: false, is_suspended: true });
        }
    } catch (error) {
        try {
            let response2 = await fetch(`${ptlaUrl}/api/client/servers/${req.params.id}`, {
                "method": "GET",
                "headers": {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ptlaAcc}`
                }
            });

            const data2 = await response2.json();
            console.error(error);
            const is_suspended = data2.attributes.is_suspended;
            res.json({ success: false, is_suspended: is_suspended });
        } catch (innerError) {
            console.error(innerError);
            res.json({ success: false, is_suspended: true });
        }
    }
});



  const { pterosocket } = require('pterosocket');
  const express = require('express');
  app.use(express.json());
  const path = require('path');

  const PTERO_API_URL = settings.pterodactyl.domain;

app.get('/control', async (req, res) => {
  const serverId = req.query.id;
  const action = req.query.action;
  if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });
  if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.identifier == req.query.id).length == 0) return res.json({ error: "Could not find server with that ID." });
  if (!serverId || !action) {
    return res.status(400).send('missing id');
  }

  try {
    const apiKey = settings.pterodactyl.account_key;
    const apiUrl = `${PTERO_API_URL}/api/client/servers/${serverId}/power`;
    let apiAction;
    if (action === 'start') {
      apiAction = 'start';
    } else if (action === 'stop') {
      apiAction = 'stop';
    } else if (action === 'restart') {
      apiAction = 'restart';
    } else if (action === 'kill') {
      apiAction = 'kill';
    } else {
      return res.status(400).send('Ungültige Aktion. Unterstützte Aktionen sind "start", "stop", "restart" und "kill".');
    }

    const response = await axios.post(apiUrl, {
      signal: apiAction,
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    res.send(`Server ${serverId} ${apiAction === 'start' ? 'gestartet' : (apiAction === 'stop' ? 'gestoppt' : `${apiAction} durchgeführt`)}.`);
  } catch (error) {
    res.status(500).send('Interner Serverfehler.');
  }
});

app.post('/control/delete', async (req, res) => {
  const server_idnum = req.body.serverId;
  const filePath = req.body.filePath;
  
  const origintzui = settings.pterodactyl.domain;
  const appkey = settings.pterodactyl.account_key;

  
  try {
      const deleteUrl = `${origintzui}/api/client/servers/${server_idnum}/files/delete`;
      const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${appkey}`,
              'Cookie': `pterodactyl_session=${encodeURIComponent(req.headers.cookie)}`,
          },
          body: JSON.stringify({
              root: '/',
              files: [filePath]
          })
      });
      if (!deleteResponse.ok) {
          const errorMessage = await deleteResponse.text();
          return res.status(deleteResponse.status).send(errorMessage);
      }
      res.status(200).send('File or folder deleted successfully.');
  } catch (error) {
      console.error('Error deleting file or folder:', error);
      return res.status(500).send('Error deleting file or folder.');
  }
});
app.post('/control/createFolder', async (req, res) => {
  const server_idnum = req.body.serverId;
  const directory = req.body.directory || '/';
  const folderName = req.body.folderName;
  const origintzui = settings.pterodactyl.domain;
  const appkey = settings.pterodactyl.account_key;
  try {
      const createFolderUrl = `${origintzui}/api/client/servers/${server_idnum}/files/create-folder`;
      const createFolderResponse = await fetch(createFolderUrl, {
          method: 'POST',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${appkey}`,
              'Cookie': `pterodactyl_session=${encodeURIComponent(req.headers.cookie)}`,
          },
          body: JSON.stringify({
              root: directory,
              name: folderName
          })
      });
      if (!createFolderResponse.ok) {
          const errorMessage = await createFolderResponse.text();
          return res.status(createFolderResponse.status).send(errorMessage);
      }

      res.status(200).send('Folder created successfully.');
  } catch (error) {
      console.error('Error creating folder:', error);
      return res.status(500).send('Error creating folder.');
  }
});
app.get('/fi', async (req, res) => {
  const server_idnum = req.query.id;
  const directory = req.query.dir || '';

  if (!server_idnum) {
    return res.status(400).send('Server-ID fehlt in der Anfrage.');
  }

  const origintzui = settings.pterodactyl.domain;
  const appkey = settings.pterodactyl.account_key;

  if (!origintzui || !appkey) {
    console.error('Credentials are missing. Make sure to provide domain and account key.');
    return res.status(500).send('Credentials are missing.');
  }
  try {
    const fileListUrl = `${origintzui}/api/client/servers/${server_idnum}/files/list?directory=${encodeURIComponent(directory)}`;
    const fileListResponse = await fetch(fileListUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appkey}`,
        'Cookie': `pterodactyl_session=${encodeURIComponent(req.headers.cookie)}`,
      },
    });
    if (!fileListResponse.ok) {
      const errorMessage = await fileListResponse.text();
      return res.status(fileListResponse.status).send(errorMessage);
    }
    const fileList = await fileListResponse.json();
    const sftpDetailsUrl = `${origintzui}/api/client/servers/${server_idnum}/sftp`;
    const sftpDetailsResponse = await fetch(sftpDetailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appkey}`,
        'Cookie': `pterodactyl_session=${encodeURIComponent(req.headers.cookie)}`,
      },
    });

    if (sftpDetailsResponse.ok) {
      const sftpDetails = await sftpDetailsResponse.json();
      fileList.sftpDetails = sftpDetails;
    }

    res.json(fileList);
  } catch (error) {
    return res.status(500).send('Error fetching file list.');
  }
});


app.post('/saveFileContent', async (req, res) => {
  const serverId = req.query.id;
  const filePath = req.query.filePath;
  const content = req.body.content;
  const origintzui = settings.pterodactyl.domain;
  const appkey = settings.pterodactyl.account_key;

  if (!serverId || !filePath || !content) {
      return res.status(400).send('Server-ID, Dateipfad oder Inhalt fehlen in der Anfrage.');
  }
  try {
      const updateFileUrl = `${origintzui}/api/client/servers/${serverId}/files/write`;
      const response = await fetch(updateFileUrl, {
          method: 'POST',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${appkey}`
          },
          body: JSON.stringify({
              path: filePath,
              contents: content
          })
      });

      if (response.ok) {
          res.send('Dateiinhalt erfolgreich gespeichert.');
      } else {
          const errorMessage = await response.text();
          res.status(response.status).send(errorMessage);
      }
  } catch (error) {
      console.error('Fehler beim Speichern des Dateiinhalts:', error);
      res.status(500).send('Fehler beim Speichern des Dateiinhalts.');
  }
});
app.get('/fileContent', async (req, res) => {
  const server_idnum = req.query.id;
  const filePath = req.query.filePath;

  if (!server_idnum || !filePath) {
    return res.status(400).send('Server-ID oder Dateipfad fehlen in der Anfrage.');
  }

  const origintzui = settings.pterodactyl.domain;
  const appkey = settings.pterodactyl.account_key;

  if (!origintzui || !appkey) {
    console.error('Credentials are missing. Make sure to provide domain and account key.');
    return res.status(500).send('Credentials are missing.');
  }

  try {
    const fileContentUrl = `${origintzui}/api/client/servers/${server_idnum}/files/contents?file=${encodeURIComponent(filePath)}`;
    const fileContentResponse = await fetch(fileContentUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appkey}`,
        'Cookie': `pterodactyl_session=${encodeURIComponent(req.headers.cookie)}`,
      },
    });
    if (!fileContentResponse.ok) {
      const errorMessage = await fileContentResponse.text();
      return res.status(fileContentResponse.status).send(errorMessage);
    }
    const fileContent = await fileContentResponse.text();
    res.send(fileContent);
  } catch (error) {
    console.error('Error fetching file content:', error);
    return res.status(500).send('Error fetching file content.');
  }
});
  app.get('/sri', async (req, res) => {
    const server_idnum = req.query.id;
    if (!server_idnum) {
        return res.status(400).send('Server-ID fehlt in der Anfrage.');
    }
    const origintzui = settings.pterodactyl.domain;
    const appkey = settings.pterodactyl.account_key;
    if (!origintzui || !appkey) {
        return res.status(500).send('Credentials are missing.');
    }
    try {
        const serverInfoUrl = `${origintzui}/api/client/servers/${server_idnum}`;
        const serverInfoResponse = await fetch(serverInfoUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appkey}`,
            },
        });
        if (!serverInfoResponse.ok) {
            const errorMessage = await serverInfoResponse.text();
            return res.status(serverInfoResponse.status).send(errorMessage);
        }
        const serverInfo = await serverInfoResponse.json();
        const resourcesUrl = `${origintzui}/api/client/servers/${server_idnum}/resources`;
        const resourcesResponse = await fetch(resourcesUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appkey}`,
            },
        });
        if (!resourcesResponse.ok) {
            console.error('Error fetching server resources:', resourcesResponse.status);
            const errorMessage = await resourcesResponse.text();
            return res.status(resourcesResponse.status).send(errorMessage);
        }
        const resourcesInfo = await resourcesResponse.json();
        const combinedInfo = {
            server: serverInfo,
            resources: resourcesInfo,
        };

        res.json(combinedInfo);
    } catch (error) {
        console.error('Error fetching server information:', error.message);
        return res.status(500).send('Error fetching server information.');
    }
});
async function sendRequest(method, path, data = {}) {
  try {
      const response = await axios({
          method: method,
          url: `${API_URL}/api/application${path}`,
          data: data,
          headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          }
      });
      return response.data;
  } catch (error) {
      throw new Error(error.response.data.error);
  }
}


const activeConnections = new Set();

app.get('/wss', async (req, res) => {
     if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });
  try {
    const server_idnum = req.query.id;
    if (activeConnections.has(server_idnum)) {
      return res.json({ error: "Connection already active for this server ID." });
    }
    if (!server_idnum) return res.json({ error: "Missing id." });
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.control == true) {
      const pterodactylApiUrl = settings.pterodactyl.domain; 
      const pterodactylApiKey = settings.pterodactyl.account_key;

      const pterodactylResponse = await axios.get(`${pterodactylApiUrl}/api/client/servers/${server_idnum}`, {
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
        },
      });
      const serverExists = pterodactylResponse.status === 200;
      if (!serverExists) return res.json({ error: "This server doesn't exist." });
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.identifier == req.query.id).length == 0) return res.json({ error: "Could not find server with that ID." });
      const origintzui = settings.pterodactyl.domain;
      const apppkey = settings.pterodactyl.account_key;


      if (!origintzui || !apppkey) {
        console.error('Credentials are missing. Make sure to provide domain and account key.');
        return res.status(500).json({ error: 'Credentials are missing.' });
      }
      const consoleFilePath = path.join(__dirname, 'console-files', `${server_idnum}.json`);
      const socket = new pterosocket(origintzui, apppkey, server_idnum);
      activeConnections.add(server_idnum, socket);

      socket.on('start', () => {
      });

      const consoleOutputHandler = (output) => {
        let consoleData = [];
        if (fs.existsSync(consoleFilePath)) {
          const fileContent = fs.readFileSync(consoleFilePath, 'utf8');
          consoleData = JSON.parse(fileContent);
          const maxLines = 50;
          if (consoleData.length >= maxLines) {
            const excessLines = consoleData.length - maxLines;
            consoleData = consoleData.slice(excessLines);
          }
        }
        consoleData.push({ timestamp: new Date().toISOString(), output });
        fs.writeFileSync(consoleFilePath, JSON.stringify(consoleData, null, 2));
      };
      socket.on('console_output', consoleOutputHandler);
      const intervalId = setInterval(() => {
      }, 200);
      const timeoutMillis = 20 * 60 * 1000;
      setTimeout(() => {
        clearInterval(intervalId); 
        socket.close(); 
        res.end(); 
      }, timeoutMillis);
    }
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const sendCommand = (serverId, command) => {
  const origin = settings.pterodactyl.domain;
  const apiKey = settings.pterodactyl.account_key;

  const socket = new pterosocket(origin, apiKey, serverId);

  socket.on("start", () => {
      socket.writeCommand(command);
      socket.on('error', ()=>0)
  });
};

app.get('/wsc', (req, res) => {
  const { id, command } = req.query;
  if (!id || !command) {
      return res.status(400).json({ error: "Missing id or command" });
  }
  sendCommand(id, command);
  const responseMessage = `Command ${command} sent for server ${id}`;
  res.json({ message: responseMessage });
});

app.get('/ctrl', (req, res) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'ID parameter is missing' });
  }
  const folderPath = path.join(__dirname, 'console-files');
  const filePath = path.join(folderPath, `${id}.json`);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(JSON.parse(data));
  });
});















  app.get("/delete", async (req, res) => {

    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");



    let theme = indexjs.get(req);
    const serverId = req.query.id;
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");


      try {
        let serverident = await fetch(
          settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
          {
            method: "get",
            headers: {
              'Content-Type': 'application/json',
              "Authorization": `Bearer ${settings.pterodactyl.key}`
            }
          }
        );
    
        if (!serverident.ok) {
          throw new Error(`HTTP-Fehler! Status: ${serverident.status}`);
        }
    
        const data = await serverident.json();
        const serverIDf = data.attributes.identifier;
    

        const server_idnum = req.query.id;
        if (activeConnections.has(server_idnum)) {
          const socket = activeConnections.get(serverIDf);
          socket.close();
          activeConnections.delete(serverIDf);
        }


      } catch (error) {
        console.error("error on api request:", error);
        return res.send("Fehler beim Abrufen der Serverdaten.");
      }



      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );


      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("Failed to delete the server. Change the url to /forcedelete instead of /delete if you'd like to force delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect(theme.settings.redirect.deleteserver ? theme.settings.redirect.deleteserver : "/");
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });

  app.get("/forcedelete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/force",
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("Still cannot delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect(theme.settings.redirect.deleteserver ? theme.settings.redirect.deleteserver : "/");
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });



  

  app.get("/create", async (req, res) => {


    const costPerRam = settings.costPerRam;
    const costPerCpu = settings.costPerCpu;
    const costPerGbStorage = settings.costPerGbStorage;


    try {
      if (!req.session.pterodactyl) return res.json({ "success": false, "message": "unauthenticated", "redirect": "/login" });
      if (true == true) {
        const cacheaccount = await fetch(
          settings.pterodactyl.domain + "/api/application/users/" + req.session.pterodactyl.id + "?include=servers",
          {
            method: "get",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
          }
        );

        if (cacheaccount.statusText === "Not Found") {
          return res.json({ "success": false, "message": "INVALIDUSER" });
        }

        const cacheaccountinfo = await cacheaccount.json();
        if (!cacheaccount) {
          return res.json({ "success": false, "message": "PANELERROR" });
        }
        req.session.pterodactyl = cacheaccountinfo.attributes;
        if (req.query.name && req.query.description && req.query.ram && req.query.disk && req.query.cpu && req.query.backups && req.query.allocations && req.query.databases && req.query.egg && req.query.location) {
          try {
            decodeURIComponent(req.query.name)
          } catch (err) {
            return res.json({ "success": false, "message": "INVALIDSERVERNAME" });
          }
          let packagename = await db.get("package-" + req.session.userinfo.id);
          let package = settings.api.client.packages.list[packagename ? packagename : settings.api.client.packages.default];
          let extra =
            await db.get("extra-" + req.session.pterodactyl.username) ||
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0,
              databases: 0,
              allocations: 0,
              backups: 0
            };

          let ram2 = 0;
          let disk2 = 0;
          let cpu2 = 0;
          let databases2 = 0;
          let allocations2 = 0;
          let backups2 = 0;
          let servers2 = req.session.pterodactyl.relationships.servers.data.length;
          for (let i = 0, len = req.session.pterodactyl.relationships.servers.data.length; i < len; i++) {
            ram2 = ram2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.memory;
            disk2 = disk2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.disk;
            cpu2 = cpu2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.cpu;
            backups2 = backups2 + req.session.pterodactyl.relationships.servers.data[i].attributes.feature_limits.cpu;
            databases2 = databases2 + req.session.pterodactyl.relationships.servers.data[i].attributes.feature_limits.cpu;
            allocations2 = allocations2 + req.session.pterodactyl.relationships.servers.data[i].attributes.feature_limits.cpu;
          };

          if (servers2 >= package.servers + extra.servers) {
            return res.json({ "success": false, "message":"NOSLOTS" });
          }
          let name = decodeURIComponent(req.query.name);
          if (name.length < 1) {
            return res.json({ "success": false, "message":"LITTLESERVERNAME" });
          }
          if (name.length > 191) {
            return res.json({ "success": false, "message":"TOOMANYCHARACTERS" });
          }
          let location = req.query.location;

          if (Object.entries(settings.api.client.locations).filter(vname => vname[0] == location).length !== 1) {
            return res.json({ "success": false, "message": "INVALIDLOCATION" });
          }

          let requiredpackage = Object.entries(settings.api.client.locations).filter(vname => vname[0] == location)[0][1].package;
          if (requiredpackage) if (!requiredpackage.includes(packagename ? packagename : settings.api.client.packages.default)) {
            return res.json({ "success": false, "message": "PREMIUMLOCATION" });
          }

          let egg = req.query.egg;

          let egginfo = eggconfig[egg];
          if (!eggconfig[egg]) {
            return res.json({ "success": false, "message": "INVALIDEGG" });
          }
          let ram = parseFloat(req.query.ram);
          let disk = parseFloat(req.query.disk);
          let cpu = parseFloat(req.query.cpu);
          let databases = parseFloat(req.query.databases);
          let allocations = parseFloat(req.query.allocations);
          let backups = parseFloat(req.query.backups);



          const diskInGb = disk / 1024;
          const ramInGb = ram / 1024;
          const cpuInCores = cpu / 100;


          const totalCost = ramInGb*costPerRam + cpuInCores*costPerCpu + diskInGb * costPerGbStorage ;
console.log(totalCost)

          if (!isNaN(ram) && !isNaN(disk) && !isNaN(cpu) && !isNaN(databases) && !isNaN(backups) && !isNaN(allocations)) {
            if (ram2 + ram > package.ram + extra.ram) {
              return res.json({ "success": false, "message": `Exceeded ram!, ${package.ram + extra.ram - ram2}` });
            }
            if (disk2 + disk > package.disk + extra.disk) {
              return res.json({ "success": false, "message": `Exceeded disk!, ${package.disk + extra.disk - disk2}` });
            }
            if (cpu2 + cpu > package.cpu + extra.cpu) {
              return res.json({ "success": false, "message": `Exceeded cpu!, ${package.cpu + extra.cpu - cpu2}` });
            }
            if (databases2 + databases > package.databases + extra.databases) {
              return res.json({ "success": false, "message": `Exceeded databases!, ${package.databases + extra.databases - databases2}` });
            }
            if (backups2 + backups > package.backups + extra.backups) {
              return res.json({ "success": false, "message": `Exceeded backups!, ${package.backups + extra.backups - backups2}` });
            }
            if (allocations2 + allocations > package.allocations + extra.allocations) {
              return res.json({ "success": false, "message": `Exceeded allocations!, ${package.allocations + extra.allocations - allocations2}` });
            }
            if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) {
              return res.json({ "success": false, "message": `You should deploy the server with minimum of ${egginfo.minimum.ram}mb ram` });
            }
            if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) {
              return res.json({ "success": false, "message": `You should deploy the server with minimum of ${egginfo.minimum.disk}mb disk` });
            }
            if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) {
              return res.json({ "success": false, "message": `You should deploy the server with minimum of ${egginfo.minimum.cpu}% cpu` });
            }
            if (egginfo.maximum) {
              if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) {
                return res.json({ "success": false, "message": `You can deploy the server with maximum of ${egginfo.maximum.ram}mb ram` });
              }
              if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) {
                return res.json({ "success": false, "message": `You can deploy the server with maximum of ${egginfo.maximum.disk}mb disk` });
              }
              if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) {
                return res.json({ "success": false, "message": `You can deploy the server with maximum of ${egginfo.maximum.ram}% cpu` });
              }
            }
            const createdServer = await db.get(`createdserver-${req.session.userinfo.id}`)
            const createdStatus = createdServer ?? false
            const coins = await db.get("coins-" + req.session.userinfo.id) ?? 0;
            const cost = settings.features.server.cost
            if (createdStatus && coins < totalCost) {
              return res.json({ "success": false, "message": "TOOLITTLECOINS" });
            }
            let serverinfo = await fetch(
              settings.pterodactyl.domain + "/api/application/servers",
              {
                method: "post",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
                body: JSON.stringify(
                  {
                    name: name,
                    user: req.session.pterodactyl.id,
                    egg: egginfo.info.egg,
                    docker_image: egginfo.info.docker_image,
                    startup: egginfo.info.startup,
                    environment: egginfo.info.environment,
                    limits: {
                      memory: ram,
                      cpu: cpu,
                      disk: disk,
                      swap: -1,
                      io: 500
                    },
                    feature_limits: {
                      databases: databases,
                      backups: backups,
                      allocations: allocations
                    },
                    deploy: {
                      locations: [location],
                      dedicated_ip: false,
                      port_range: []
                    }
                  }
                )
              }
            );

            const serverInfoText = await serverinfo.json();

            if (serverinfo.statusText !== "Created") {
              console.log(serverInfoText);
              return res.json({ "success": false, "message": serverInfoText.errors[0].detail });
            }
            let newpterodactylinfo = req.session.pterodactyl;
            newpterodactylinfo.relationships.servers.data.push(serverInfoText);
            req.session.pterodactyl = newpterodactylinfo;
            await db.set(`lastrenewal-${serverInfoText.attributes.id}`, Date.now())
            await db.set(`createdserver-${req.session.userinfo.id}`, true)
            if (createdStatus) {
              const price = req.query.price
              if (price !== "FREE") {
                await db.set("coins-" + req.session.userinfo.id, coins - req.query.price);
            }
            }
            log('created server', `${req.session.userinfo.username} deployed a new server named \`${name}\`\`\`\``)
            return res.redirect("/servers");
          } else {
            return res.json({ "success": false, "message": "NOTANUMBER" });
          }
        } else {
          return res.json({ "success": false, "message": "MISSINGVARIABLE" });
        }
      } else {
        return res.json({ "success": false, "message": "SERVERCREATIONDISABLED" });
      }
    } catch (error) {
      console.log(error)
      return res.json({ "success": false, "message": "An error occured while creating the server.", "error": error });
    }
  });
}
