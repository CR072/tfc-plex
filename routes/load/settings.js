const settings = require('./settings.json');

module.exports = {
  get: function (key) {
    // Gib den Wert der übergebenen Einstellung zurück
    return settings[key];
  }
};
