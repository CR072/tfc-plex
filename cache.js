const cache = {};

function addToCache(key, value) {
    cache[key] = value;
}

function getFromCache(key) {
    return cache[key];
}

module.exports = { addToCache, getFromCache };
