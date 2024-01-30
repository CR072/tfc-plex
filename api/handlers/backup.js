const fs = require("fs");
const path = require("path");

module.exports.load = async function (app, db) {
    setInterval(() => {
        const timestamp = new Date().toISOString().replace(/[-T:]/g, "");
        const backupDir = path.join(__dirname, "backup");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        const backupFilename = `backup_${timestamp}.zip`;
        const backupFilePath = path.join(backupDir, backupFilename);
        const archive = require("archiver")("zip", { zlib: { level: 9 } });
        const output = fs.createWriteStream(backupFilePath);
        archive.directory(path.join(__dirname, "..", ".."), false);
        archive.pipe(output);
        archive.finalize();
        console.log(`Backup created: ${backupFilename}`);
    }, 7 * 24 * 60 * 60 * 1000);

};
