const express = require('express');
const app = express();
const port = require('./settings.json').port;
const version = require('./settings.json').version;
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');
const settings = require('./settings.json');
const middleware = require('./routes/handler/middleware');


// Express-App-Konfiguration
app.set('view engine', 'ejs');
app.use(express.static('theme'));

// SQLite-Datenbank-Konfiguration
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, discordId TEXT, username TEXT, email TEXT, avatar TEXT, coins INTEGER, resources TEXT, admin BOOLEAN)');
});

app.set('db', db);

// Express-Session-Konfiguration
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
}));

// Passport-Konfiguration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.discordId);
});

passport.deserializeUser((discordId, done) => {
  db.get('SELECT * FROM users WHERE discordId = ?', discordId, (err, row) => {
    if (err) {
      return done(err);
    }
    done(null, row);
  });
});

passport.use(new DiscordStrategy({
  clientID: settings.discord.clientID,
  clientSecret: settings.discord.clientSecret,
  callbackURL: settings.discord.callbackURL,
  scope: ['identify', 'email', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    discordId: profile.id,
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
    coins: 0, // Beispiel für Coins
    resources: '{"ram": 0, "cpu": 0, "drive": 0, "allocations": 0, "databases": 0, "serverSlots": 0}', // Beispiel für Ressourcen
    admin: false,
  };

  db.run('INSERT OR IGNORE INTO users (discordId, username, email, avatar, coins, resources, admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user.discordId, user.username, user.email, user.avatar, user.coins, user.resources, user.admin],
    (err) => {
      if (err) {
        return done(err);
      }
      done(null, user);
    }
  );
}));

// Routen-Konfiguration
const authRoutes = require('./routes/auth/auth');
app.use('', authRoutes);

const themeRoutes = require('./routes/load/theme');
app.use('', themeRoutes);

// Starte den Server
app.listen(port, () => {
  console.log(`Server version ${version} is running on port ${port}`);
});
