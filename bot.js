const SERVER_DATA_API = "https://qrp6ujau11f36bnm-cuvwx.xyz:8443/2222/status";

async function testFetchServerStats() {
    try {
        console.log(`\n[${new Date().toLocaleTimeString()}] Fetching live metrics dataset...`);
        const res = await fetch(SERVER_DATA_API);
        
        if (res.ok) {
            const data = await res.json();
            // Handle if the data is wrapped in a .servers property or direct object
            const serverList = (data && data.servers) ? data.servers : data;
            
            if (serverList && typeof serverList === 'object') {
                let formattedRows = "Live Status:\nServer | Players | Uptime | MSPT\n";
                let topServerName = "none";
                let maxPlayers = -1;

                for (const [key, val] of Object.entries(serverList)) {
                    if (val && typeof val === 'object') {
                        const currentPlayers = Number(val.players ?? val.playerCount ?? val.currentPlayers ?? 0);
                        const serverUptime = val.uptime ?? 'unknown';
                        const serverMspt = val.mspt ?? val.performance ?? '0';

                        formattedRows += `${key} | ${currentPlayers} players | ${serverUptime} | ${serverMspt} mspt\n`;

                        if (currentPlayers > maxPlayers) {
                            maxPlayers = currentPlayers;
                            topServerName = key;
                        }
                    }
                }

                if (maxPlayers >= 0) {
                    formattedRows += `\nFact: The server currently containing the most players is '${topServerName}' with exactly ${maxPlayers} players online.\n`;
                }

                console.log(formattedRows);
            } else {
                console.log("❌ Live tracking table data parsing error (Not an object).");
            }
        } else {
            console.log(`❌ HTTP Error: Received status code ${res.status}`);
        }
    } catch (err) {
        console.log("❌ Network Error: Live tracking table data is currently offline or unreachable.");
        console.error(err.message);
    }
}

// Run immediately on start
testFetchServerStats();

// Repeat every 5000 milliseconds (5 seconds)
setInterval(testFetchServerStats, 5000);
                    
