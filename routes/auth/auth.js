const express = require('express');
const router = express.Router();
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

const settings = require('../../settings.json');

// Verbindung zur SQLite-Datenbank herstellen
const db = new sqlite3.Database('./database.db');

// Erstelle die Benutzertabelle, falls sie noch nicht existiert
db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, discordId TEXT, username TEXT, email TEXT, coins INTEGER DEFAULT 10)');

// Funktion zum Laden der Benutzerdaten aus der SQLite-Datenbank
async function loadUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Funktion zum Speichern der Benutzerdaten in der SQLite-Datenbank
async function saveUser(user) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (discordId, username, email, coins) VALUES (?, ?, ?, ?)', [user.discordId, user.username, user.email, user.coins || 10], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Funktion zum Aktualisieren der Coins eines Benutzers in der SQLite-Datenbank
async function updateUserCoins(userId, newCoins) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET coins = ? WHERE id = ?', [newCoins, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Hier könntest du den Benutzer aus der Datenbank abrufen
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    done(err, row);
  });
});

passport.use(new DiscordStrategy({
  clientID: settings.discord.clientID,
  clientSecret: settings.discord.clientSecret,
  callbackURL: settings.discord.callbackURL,
  scope: ['identify', 'email', 'guilds', 'guilds.join'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let users = await loadUsers();

    let user = users.find(u => u.discordId === profile.id);

    if (!user) {
      user = {
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        avatarUrl: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
        avatar: profile.avatar,
        coins: 1,
      };

      await saveUser(user);
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

router.get('/user/coins', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ coins: req.user.coins });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Endpoint zum Aktualisieren der Coins eines Benutzers
router.post('/user/updateCoins', async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const newCoins = req.body.coins; // Annahme: Der neue Münzwert wird im Anfragekörper mit dem Schlüssel "coins" übergeben
      await updateUserCoins(userId, newCoins);
      res.json({ success: true, message: 'Coins erfolgreich aktualisiert' });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.post('/auth/discord', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/auth/discord',
  failureFlash: true
}));

// Discord OAuth Authentifizierung
router.get('/auth/discord', passport.authenticate('discord'));
router.get('/auth/callback', passport.authenticate('discord', {
  successRedirect: '/dashboard',
  failureRedirect: '/auth/discord'
}));

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Stelle sicher, dass die SQLite-Verbindung bei Server-Shutdown geschlossen wird
process.on('SIGINT', () => {
  db.close();
  process.exit();
});

module.exports = router;
