const express = require('express');
const themeRoutes = express.Router();
const path = require('path'); // Füge das require für den 'path'-Modul hinzu
const middleware = require('../handler/middleware');
const mime = require('mime');
const settings = require('../../settings.json');

const fs = require('fs').promises;

const cssPath = path.join(__dirname, '../../assets');



let userinfo;
fs.readFile(path.join(__dirname, '../../users.json'), 'utf8')
  .then(data => {
    useri = JSON.parse(data);
  })
  .catch(err => {
    console.error('Fehler beim Laden der users.json-Datei:', err);
  });



themeRoutes.use('/assets', express.static(cssPath, {
  setHeaders: (res, path) => {
    res.setHeader('Content-Type', mime.getType(path));
  }
}));

themeRoutes.get('/', (req, res) => {
  res.render('../theme/index', { settings: settings });
});

themeRoutes.get('/login', (req, res) => {
  res.render('../theme/login', { settings: settings });
});


// Authentifizierung erforderlich
themeRoutes.get('/dashboard', middleware.ensureAuthenticated, (req, res) => {
  res.render('../theme/dashboard', { settings: settings, userinfo: useri, user: req.user });
});


themeRoutes.get('/up', middleware.ensureAuthenticated, (req, res) => {
  res.render('../theme/up', { settings: settings, userinfo: useri, user: req.user });
});

module.exports = themeRoutes;
