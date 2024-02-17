const fs = require("fs");
const path = require("path");
const util = require("util");


module.exports.load = async function (app, db) {

    function getCurrentTimestamp() {
        return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }

    const logDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    
    const logFilePath = path.join(logDir, "console.log");
    const logStream = fs.createWriteStream(logFilePath, { flags: "a" });
    const originalConsoleLog = console.log;
    
    console.log = function (...args) {
        const logMessage = util.format.apply(null, args);
        logStream.write(`${getCurrentTimestamp()} ${logMessage}\n`, (err) => {
            if (err) {
                console.error(`Error writing to log file: ${err}`);
            }
        });
        originalConsoleLog.apply(console, args);
    };
    
    function blog(message) {
        const logMessage = `${getCurrentTimestamp()} ${message}`;
        logStream.write(`${logMessage}\n`, (err) => {
            if (err) {
                console.error(`Error writing background log to file: ${err}`);
            }
        });
    }
};