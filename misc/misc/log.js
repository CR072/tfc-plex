const settings = require('../settings.json')
const fetch = require('node-fetch')

/**
 * Log an action to Discord
 * @param {string} action 
 * @param {string} message 
 */
module.exports = (action, message) => {
    if (!settings.logging.status) return
    if (!settings.logging.actions.user[action] && !settings.logging.actions.admin[action]) return

    fetch(settings.logging.webhook, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            embeds: [
                {
                    avatar_url: settings.icon || 'https://cdn.tfc-plex.de/img/tfc.png',
                    color: hexToDecimal('#191c24'),
                    title: `Event: \`${action}\``,
                    description: message,
                    author: {
                        name: 'Logging',
                        icon_url: settings.icon || 'https://cdn.tfc-plex.de/img/gitlogo.png',
                    },
                    thumbnail: {
                        url: 'https://cdn.tfc-plex.de/img/gitlogo.png'
                    }
                }
            ]
        })
    })
    .catch(() => {})
}

function hexToDecimal(hex) {
    return parseInt(hex.replace("#", ""), 16)
}
