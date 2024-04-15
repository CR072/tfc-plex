/*
 * APPENDIX FOR LEGAL PURPOSES *
   Copyright (c) 2024, privt00
   Copyright (c) 2024, CR072 and the HolaClient project

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

 *--------------------------------------------------------------------------
 *   _    _       _        _____ _ _            _   
 * | |  | |     | |      / ____| (_)          | |  
 * | |__| | ___ | | __ _| |    | |_  ___ _ __ | |_ 
 * |  __  |/ _ \| |/ _` | |    | | |/ _ \ '_ \| __|
 * | |  | | (_) | | (_| | |____| | |  __/ | | | |_ 
 * |_|  |_|\___/|_|\__,_|\_____|_|_|\___|_| |_|\__|
 *--------------------------------------------------------------------------
 *
 * @author CR072 <crazymath072@holaclient.tech>
 * @license Apache-2.0
 * 
 * https://holaclient.tech
 * 
 * © 2022-2024 HolaClient
*/
const fs = require("fs");
const indexjs = require("../index.js");
const settings = require("../settings.json");
const fetch = require("node-fetch");
const chalk = require("chalk");
const panelUrl = settings.pterodactyl.domain;
const panelApiKey = settings.pterodactyl.key;
const panelUserKey = settings.pterodactyl.account_key;
const scanInterval = settings.anti_pteroVM.time * 60 * 1000;
const susFiles = settings.anti_pteroVM.level;
let susFilesRm;

if (susFiles == "low") {
    susFilesRm = 4;
} else if (susFiles == "medium") {
    susFilesRm = 3;
} else if (susFiles == "high") {
    susFilesRm = 2;
} else if (susFiles == "strict") {
    susFilesRm = 1;
} else {
    susFilesRm = 1;
}

module.exports.load = function (app, db) {
    async function suspendServer(serverId, serverName, serverOwner, serverI, numFilesMatched) {
        try {
            console.log(
                chalk.cyan("[") +
                chalk.whiteBright("TFC-Plex AntiVM") +
                chalk.cyan("]") +
                chalk.red(` Suspending server "${serverName}"...`)
            );

            const description = numFilesMatched > susFilesRm
                ? `Server suspended by TFC-Plex (${numFilesMatched} suspicious files found). High chances of PteroVM or any other malicious software.`
                : `Server checked by TFC-Plex. No action taken.`;

            const serverDetailsResponse = await fetch(
                `${panelUrl}/api/application/servers/${serverI}/details`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${panelApiKey}`,
                        "Content-Type": "application/json",
                        Accept: "application/vnd.pterodactyl.v1+json",
                    },
                    body: JSON.stringify({
                        name: serverName,
                        user: serverOwner,
                        description: description,
                    }),
                }
            );

            if (!serverDetailsResponse.ok) {
                throw new Error(
                    `Failed to update server details for server with ID ${serverId}: ${serverDetailsResponse.status} ${serverDetailsResponse.statusText}`
                );
            }

            if (numFilesMatched > 2) {
                const suspendResponse = await fetch(
                    `${panelUrl}/api/application/servers/${serverI}/suspend`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${panelApiKey}`,
                            "Content-Type": "application/json",
                            Accept: "application/vnd.pterodactyl.v1+json",
                        },
                    }
                );

                if (!suspendResponse.ok) {
                    throw new Error(
                        `Failed to suspend server with ID ${serverId}: ${suspendResponse.status} ${suspendResponse.statusText}`
                    );
                }
            }

            console.log(
                chalk.cyan("[") +
                chalk.whiteBright("TFC-Plex AntiVM") +
                chalk.cyan("]") +
                chalk.green(` Server ${serverName} suspended successfully.`)
            );
        } catch (error) {
            console.error(`Failed to suspend server with ID ${serverId}:`, error);
        }
    }

    async function scanServerFiles(serverId, serverName, serverOwner, serverI) {
        try {
            console.log(
                chalk.cyan("[") +
                chalk.whiteBright("TFC-Plex AntiVM") +
                chalk.cyan("]") +
                chalk.whiteBright(` Scanning files for server "${chalk.cyan(serverName)}"`)
            );

            const serverFilesResponse = await fetch(
                `${panelUrl}/api/client/servers/${serverId}/files/list`,
                {
                    headers: {
                        Authorization: `Bearer ${panelUserKey}`,
                        Accept: "application/vnd.pterodactyl.v1+json",
                    },
                }
            );

            if (!serverFilesResponse.ok) {
                throw new Error(
                    `Failed to retrieve files for server with ID ${serverId}: ${serverFilesResponse.status} ${serverFilesResponse.statusText}`
                );
            }

            const serverFilesData = await serverFilesResponse.json();
            const files = serverFilesData.data;

            const suspiciousFileNames = require('./suspiciousFileNames.json');

            const miningRelatedFileNames = [
                "minerd", "cgminer", "bfgminer", "cpuminer", "stratumproxy"
            ];

            const foundFiles = files.filter(file =>
                suspiciousFileNames.includes(file.attributes.name) ||
                miningRelatedFileNames.includes(file.attributes.name)
            );

            if (foundFiles.length > susFilesRm) {
                await suspendServer(serverId, serverName, serverOwner, serverI, foundFiles.length);
            }
        } catch (error) {
            console.error(`Failed to scan files for server with ID ${serverId}:`, error);
        }
    }

    async function scanServers() {
        try {
            console.log(" ");
            console.log(
                chalk.gray("[⛏️]") +
                chalk.cyan("[") +
                chalk.whiteBright("TFC-Plex") +
                chalk.cyan("]") +
                chalk.whiteBright(" Scanning servers for Ptero-VM...")
            );
            
            const servers = [];
            
            async function getServersOnPage(page) {
                return new Promise(async (resolve) => {
                    const response = await fetch(
                        settings.pterodactyl.domain + "/api/application/servers/?page=" + page,
                        {
                            headers: {
                                "Authorization": `Bearer ${settings.pterodactyl.key}`
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Failed to fetch server list: ${response.status} ${response.statusText}`);
                    }

                    resolve(response.json());
                });
            };

            let currentPage = 1;
            try {
                while (true) {
                    const serversResponse = await getServersOnPage(currentPage);
                    servers.push(...serversResponse.data);
                    if (serversResponse.meta.pagination.total_pages > currentPage) {
                        currentPage++;
                    } else {
                        break;
                    }
                }
            } catch (error) {
                console.error("Failed to fetch server list:", error);
            }

            for (const server of servers) {
                const serverId = server.attributes.identifier;
                const serverI = server.attributes.id;
                const serverName = server.attributes.name;
                const serverOwner = server.attributes.user;
                await scanServerFiles(serverId, serverName, serverOwner, serverI);
            }

            console.log(" ");
            console.log(
                chalk.gray("[✅]") +
                chalk.cyan("[") +
                chalk.whiteBright("TFC-Plex") +
                chalk.cyan("]") +
                chalk.whiteBright(" Finished scanning for Ptero-VM servers!")
            );
        } catch (error) {
            console.error("Failed to retrieve server list:", error);
        }
    }

    if (settings.anti_pteroVM.enabled == true) {
        setInterval(scanServers, scanInterval);
        scanServers();
    } else {
        console.log(" ");
        return;
    }
};
