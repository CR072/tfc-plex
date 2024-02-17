    "use strict";

    // TFC-Plex on Heliactyl build 4760 (12.3.x) - Copyright SRYDEN, Inc
    // Load packages.

    // Load packages.
    global.eggconfig = require('./eggs.json')
    const fs = require("fs");
    const fetch = require('node-fetch');
    const chalk = require("chalk");
    const axios = require("axios");




    global.Buffer = global.Buffer || require('buffer').Buffer;

    if (typeof btoa === 'undefined') {
        global.btoa = function (str) {
            return new Buffer(str, 'binary').toString('base64');
        };
    }
    if (typeof atob === 'undefined') {
        global.atob = function (b64Encoded) {
            return new Buffer(b64Encoded, 'base64').toString('binary');
        };
    }

    // Load settings.
    console.log(chalk.grey("- | Loading settings"));
    const settings = require("./settings.json");
    const crypto = require('crypto');

    // Überprüfe und randomisiere den Wert von hostid.
    if (settings.hostid === "100") {
        console.log("HostID ist gleich 100. Randomisiere den Wert.");

        // Generiere eine zufällige Zeichenkette mit 16 Zeichen
        const randomHostId = crypto.randomBytes(16).toString('hex');

        // Aktualisiere den Wert von hostid
        settings.hostid = randomHostId;

        // Schreibe die aktualisierten Einstellungen zurück in die Datei
        fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2), 'utf8');
    } else {
        null
    }

    const defaultthemesettings = {
        index: "index.ejs",
        notfound: "index.ejs",
        redirect: {},
        pages: {},
        mustbeloggedin: [],
        mustbeadmin: [],
        variables: {}
    };

    module.exports.renderdataeval =
        `(async () => {
            let products = JSON.parse(require("fs").readFileSync("./prod.json"));
    let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
        const JavaScriptObfuscator = require('javascript-obfuscator');
        const newlang = JSON.parse(require("fs").readFileSync('./languages/' + settings.language + '/lang.json'));

        let renderdata = {
        products: products,    
        req: req,
        eggs: eggconfig,
        settings: newsettings,
        lang: newlang,
        userinfo: req.session.userinfo,
        packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default : null,
        extraresources: !req.session.userinfo ? null : (await db.get("extra-" + req.session.userinfo.id) ? await db.get("extra-" + req.session.userinfo.id) : {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
        }),
            packages: req.session.userinfo ? newsettings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default] : null,
        coins: newsettings.api.client.coins.enabled == true ? (req.session.userinfo ? (await db.get("coins-" + req.session.userinfo.id) ? await db.get("coins-" + req.session.userinfo.id) : 0) : null) : null,
        pterodactyl: req.session.pterodactyl,
        theme: theme.name,
        extra: theme.settings.variables,
        referid: req.session.userinfo ? await db.get("referiduser-" + req.session.userinfo.id) : null,
        db: db,
        };

        return renderdata;
    })();`;

    console.log(chalk.white("+ | ✅ "));

    // Load database
    console.log(chalk.grey("- | Loading database"));
    const Keyv = require("keyv");
    const db = new Keyv(settings.database);

    db.on('error', err => {
        console.log(chalk.red("[DATABASE] An error has occured when attempting to access the database."));
    });

    module.exports.db = db;

    // Load websites.
    const compression = require('compression');
    const express = require("express");
    const app = express();
    require('express-ws')(app);
    const minifyHTML = require('express-minify-html');

    app.use(compression());

    // Load express addons.
    const ejs = require("ejs");
    const session = require("express-session");
    const indexjs = require("./index.js");
    console.log(chalk.white("+ | ✅ "));

    // Load the website.
    const path = require('path');
    const clearsc = './api/user/console-files';

    function deleteJsonFiles() {
        fs.readdir(clearsc, (err, files) => {
        if (err) {
            null
            return;
        }

        const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
        jsonFiles.forEach(file => {
            const filePath = path.join(clearsc, file);
    
            fs.unlink(filePath, err => {
            if (err) {
                null
            } else {
                null
            }
            });
        });
        });
    }

    deleteJsonFiles();





    console.log(chalk.grey("- | Loading Website"));


    const { addToCache, getFromCache } = require('./cache');

    // Cache für Bilder
    const imageCache = {};

    function loadImage(filePath) {
        const imageData = fs.readFileSync(filePath);
        return Buffer.from(imageData).toString('base64');
    }

    function renderImage(filePath) {
        const cachedImage = imageCache[filePath];
        if (cachedImage) {
            return cachedImage;
        } else {
            const base64Image = loadImage(filePath);
            imageCache[filePath] = base64Image;
            return base64Image;
        }
    }

    // Cache-Funktion für Templates
    function renderTemplate(filePath, data) {
        const template = getFromCache(filePath);
        if (template) {
            return template(data);
        } else {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const compiledTemplate = ejs.compile(fileContent, { filename: filePath });
            addToCache(filePath, compiledTemplate);
            return compiledTemplate(data);
        }
    }

    module.exports.renderImage = renderImage;
    module.exports.renderTemplate = renderTemplate;


    module.exports.app = app;
    const LRU = require('lru-cache');
    const ejsMate = require('ejs-mate');
    app.engine('ejs', ejsMate);
    app.set('view engine', 'ejs');

    const imageCache2 = new LRU({ max: 100, maxAge: 1000 * 60 * 60 });
    function loadImage(filePath) {
        const imageData = fs.readFileSync(filePath);
        return Buffer.from(imageData).toString('base64');
    }

    function cacheImagesFromEJS(req, res, next) {
        if (!imageCache2.length) { 
            const originalRender = res.render;
            res.render = function(view, options, callback) {
                const renderedHtml = originalRender.call(this, view, options);
                const imageUrlRegex = /url\(['"]?(.*?)['"]?\)/g;
                let match;
                while ((match = imageUrlRegex.exec(renderedHtml)) !== null) {
                    const imageUrl = match[1];
                    const imagePath = path.join(__dirname, 'public', imageUrl);
                    if (fs.existsSync(imagePath)) {
                        const base64Image = loadImage(imagePath);
                        imageCache2.set(imageUrl, base64Image); 
                    }
                }
                return renderedHtml;
            };
        }
        next();
    }

    function serveCachedImages(req, res, next) {
        const imageUrl = req.path;
        if (imageCache2.has(imageUrl)) {
            const base64Image = imageCache2.get(imageUrl);
            const imageMimeType = path.extname(imageUrl).slice(1); 
            res.setHeader('Content-Type', `image/${imageMimeType}`);
            return res.send(Buffer.from(base64Image, 'base64'));
        }
        next();
    }

    app.use(cacheImagesFromEJS);
    app.use(serveCachedImages);


    const cache = new LRU({ max: 10000, maxAge: 100000 * 60 * 60 });

    app.use(function(req, res, next) {
        if (!req.headers.cookie) { 
            const originalRender = res.render;
            res.render = function(view, options, callback) {
                const key = req.url + view; 
                const cachedHtml = cache.get(key);
                if (cachedHtml) {
                    return res.send(cachedHtml);
                }
                originalRender.call(this, view, options, function(err, html) {
                    if (!err) {
                        cache.set(key, html); 
                    }
                    if (callback) {
                        callback(err, html);
                    } else {
                        res.send(html);
                    }
                });
            };
        }
        next();
    });

    app.use((req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=20'); // Cache static files for 1 hour
        next();
    });







    app.use((req, res, next) => {
        if (req.path.substr(-1) === '/' && req.path.length > 1) {
            const query = req.url.slice(req.path.length);
            res.redirect(301, req.path.slice(0, -1) + query);
        } else {
            next();
        }
    });




    app.use(minifyHTML({
        override: true,
        exception_url: false,
        htmlMinifier: {
            removeComments: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeEmptyAttributes: true,
            minifyJS: true, 
            minifyCSS: true 
        }
    }));




    app.use(express.static(path.join(__dirname, 'public'), { maxAge: 100 * 1000 }));

    app.use(session({secret: settings.website.secret, resave: false, saveUninitialized: false}));

    app.use(express.json({
        inflate: true,
        limit: '500kb',
        reviver: null,
        strict: true,
        type: 'application/json',
        verify: undefined
    }));
    console.log(chalk.white("+ | ✅ "));
    const listener = app.listen(settings.website.port, async function () {

        console.log(chalk.blueBright(" _______________________________________________________________ "));
        console.log(chalk.blueBright('/') + chalk.blueBright("――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――") + chalk.blueBright('\\'));
        console.log(chalk.blueBright('|') + chalk.white("TFC-Plex") + chalk.white(" Checking for updates..."),chalk.blueBright("                               |"));

        try {
        let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));

        const response = await axios.get(`https://api.github.com/repos/privt00/tfc-plex/releases/latest`);
        const latestVersion = response.data.tag_name;
    

        if (latestVersion !== "v" + newsettings.version) {
            console.log(chalk.blueBright('|') + chalk.white("TFC-Plex") + chalk.yellow(" New version available!"),chalk.blueBright("       |"));
            console.log(chalk.blueBright('|') + chalk.white("TFC-Plex") + chalk.white(` Current Version: ${newsettings.version}, Latest Version: ${latestVersion}`),chalk.blueBright("       |"));
        } else {
            console.log(chalk.blueBright('|') + chalk.white("TFC-Plex") + chalk.white(" Your application is up-to-date."),chalk.blueBright("                       |"));
        }
        } catch (error) {
        console.error(chalk.blueBright('|') + chalk.white("TFC-Plex") + chalk.red(" Error checking for updates:"), error.message);
        }
        let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
        console.log(chalk.blueBright('|') + chalk.blueBright("――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――") + chalk.blueBright("|"));
        if (settings.installing) {
            console.log(chalk.blueBright('|') + chalk.whiteBright(`TFC-Plex V${newsettings.version} is online at ${settings.api.client.oauth2.link}/setup`),chalk.blueBright("       |"));
        } else {
            console.log(chalk.blueBright('|') + chalk.whiteBright(`TFC-Plex V${newsettings.version} is online at ${settings.api.client.oauth2.link}`),chalk.blueBright("             |"));
        }
        console.log(chalk.blueBright('|') + chalk.blueBright("――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――") + chalk.blueBright("|"));

        const antiVM = require("./misc/antipterovm.js");
        antiVM.load(app, db);

    });


    let caches = false;
    app.use(function (req, res, next) {
        let manager = (JSON.parse(fs.readFileSync("./settings.json").toString())).api.client.ratelimits;
        if (manager[req._parsedUrl.pathname]) {
            if (caches == true) {
                setTimeout(async () => {
                    let allqueries = Object.entries(req.query);
                    let querystring = "";
                    for (let query of allqueries) {
                        querystring = querystring + "&" + query[0] + "=" + query[1];
                    }
                    querystring = "?" + querystring.slice(1);
                    res.redirect((req._parsedUrl.pathname.slice(0, 1) == "/" ? req._parsedUrl.pathname : "/" + req._parsedUrl.pathname) + querystring);
                }, 1000);
                return;
            } else {
                caches = true;
                setTimeout(async () => {
                    caches = false;
                }, 1000 * manager[req._parsedUrl.pathname]);
            }
        }
    
        next();
    });

    // Load the API files.

    console.log(chalk.grey("- | Loading API"));

    function loadApiFiles(directory, app, db) {
        const files = fs.readdirSync(directory);
    
        for (const file of files) {
        const filePath = `${directory}/${file}`;
        if (fs.statSync(filePath).isDirectory()) {
            loadApiFiles(filePath, app, db);
        } else if (file.endsWith('.js')) {
            const apiFile = require(`./${filePath}`);
            apiFile.load(app, db);
        }
        }
    }
    
    loadApiFiles('./api', app, db);




    

    // that is if a error comes
    const errora = ("<style> body{background:url(https://www.creativefabrica.com/wp-content/uploads/2023/10/05/Galaxy-Space-Texture-Background-Graphics-80827385-1-580x387.jpg);background-size:cover; background-repeat: no-repeat ; justify-content: center; align-items: center; display: flex; height: 100vh; } h1{ color: #fff; }</style><h1>Internal Server Error Pleas Contact Admin or Join the <a href='https://discord.com/invite/BXmzHS9DRA'>Discord</a></h1>");


    app.all("*", async (req, res) => {



        if (req.session.pterodactyl) if (req.session.pterodactyl.id !== await db.get("users-" + req.session.userinfo.id)) return res.redirect("/login?prompt=none");
        let theme = indexjs.get(req);
        let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
    
        if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/login" + (req._parsedUrl.pathname.slice(0, 1) == "/" ? "?redirect=" + req._parsedUrl.pathname.slice(1) : ""));
        if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
    
    
            ejs.renderFile(
                `./themes/${theme.name}/${theme.settings.notfound}`,


                await eval(indexjs.renderdataeval),
                null,
                async function (err, str) {
                    delete req.session.newaccount;
                    delete req.session.password;
                    if (!req.session.userinfo || !req.session.pterodactyl) {
                        if (err) {
                            console.log(chalk.red(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`));
                            console.log(err);
                            return res.send(errora);
                        }

                        res.status(200);
                        return res.send(str);
                    }


                    let cacheaccount = await fetch(
                        settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
                        {
                            method: "get",
                            headers: {
                                'Content-Type': 'application/json',
                                "Authorization": `Bearer ${settings.pterodactyl.key}`
                            }
                        }
                    );

                    if (await cacheaccount.statusText == "Not Found") {
                        if (err) {
                            console.log(chalk.red(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`));
                            console.log(err);
                            return res.send(errora);
                        }

                        return res.send(str);
                    }

                    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

                    req.session.pterodactyl = cacheaccountinfo.attributes;
                    if (cacheaccountinfo.attributes.root_admin !== true) {
                        if (err) {
                            console.log(chalk.red(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`));
                            console.log(err);
                            return res.send(errora);
                        }

                        return res.send(str);
                    }

                    ejs.renderFile(
                        `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`,
                        await eval(indexjs.renderdataeval),
                        null,
                        function (err, str) {
                            delete req.session.newaccount;
                            delete req.session.password;
                            if (err) {
                                console.log(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`);
                                console.log(err);
                                return res.send(errora);
                            }

                            res.status(200);
                            res.send(str);
                        });
                });
            return;
        }

        const data = await eval(indexjs.renderdataeval)
        ejs.renderFile(
            `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`,
            data,
            null,
            function (err, str, body) {
                delete req.session.newaccount;
                delete req.session.password;
                if (err) {
                    console.log(chalk.red(`[WEBSITE] An error has occurred on path ${req._parsedUrl.pathname}:`));
                    console.log(err);
                    return res.send(errora);
                }
        



    

                str = str.replace(/<img(.*?)>/g, '<img$1 loading="lazy">');
        
                res.status(200);
                res.send(str);
            });
    });

    module.exports.get = function (req) {
        let defaulttheme = JSON.parse(fs.readFileSync("./settings.json")).defaulttheme;
        let tname = encodeURIComponent(getCookie(req, "theme"));
        let name = (
            tname ?
                fs.existsSync(`./themes/${tname}`) ?
                    tname
                    : defaulttheme
                : defaulttheme
        )
        return {
            settings: (
                fs.existsSync(`./themes/${name}/pages.json`) ?
                    JSON.parse(fs.readFileSync(`./themes/${name}/pages.json`).toString())
                    : defaultthemesettings
            ),
            name: name
        };
    };

    module.exports.islimited = async function () {
        return cache == true ? false : true;
    }

    module.exports.ratelimits = async function (length) {
        if (cache == true) return setTimeout(
            indexjs.ratelimits
            , 1
        );
        cache = true;
        setTimeout(
            async function () {
                cache = false;
            }, length * 1000
        )
    }

    // Get a cookie.
    function getCookie(req, cname) {
        let cookies = req.headers.cookie;
        if (!cookies) return null;
        let name = cname + "=";
        let ca = cookies.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return decodeURIComponent(c.substring(name.length, c.length));
            }
        }
        return "";
    }

    console.log(chalk.white("+ | ✅ "));