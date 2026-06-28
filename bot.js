import WebSocket from 'ws';
import fs from 'fs';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 
const DATA_FILE = './gold_data.json';

let userStats = {};

if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        userStats = JSON.parse(rawData);
        console.log("Successfully loaded saved gold balances from file!");
    } catch (err) {
        console.error("Error reading save file, starting fresh:", err.message);
        userStats = {};
    }
} else {
    console.log("No save file found. Initializing fresh database.");
}

function saveDatabase() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(userStats, null, 2), 'utf8');
    } catch (err) {
        console.error("Error saving data to file:", err.message);
    }
}

let ws = null;

function connectToGame() {
    console.log("Connecting to game server...");
    ws = new WebSocket(SERVER_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    ws.on('open', () => {
        console.log("Connected! Authenticating account...");
        ws.send(JSON.stringify(AUTH_PACKET));
    });

    ws.on('message', (data) => {
        try {
            const packet = JSON.parse(data.toString());
            
            if (Array.isArray(packet) && packet[0] === "M") {
                let username = "";
                let actualMessage = "";

                if (typeof packet[1] === "string") {
                    username = packet[1].trim();
                }
                
                if (typeof packet[6] === "string") {
                    actualMessage = packet[6].trim();
                }

                if (username.length > 0 && actualMessage.length > 0) {
                    const cleanMessage = actualMessage.replace(/\*/g, '').toLowerCase();

                    if (!userStats[username]) {
                        userStats[username] = {
                            gold: 1,
                            level: 0,
                            multiplier: 1.0
                        };
                        saveDatabase();
                    }

                    if (cleanMessage === "increase") {
                        const baseGain = Math.random() < 0.5 ? 1 : 2;
                        const finalGain = Math.round(baseGain * userStats[username].multiplier * 10) / 10;
                        
                        userStats[username].gold = Math.round((userStats[username].gold + finalGain) * 10) / 10;
                        
                        saveDatabase();

                        const replyMessage = `${username} gained +${finalGain} gold. now, ${userStats[username].gold} gold. multiplyer, ${userStats[username].multiplier}x).`;

                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", replyMessage]));
                        }
                    }

                    else if (cleanMessage === "buy") {
                        const currentLevel = userStats[username].level;
                        const cost = 10 * (currentLevel + 1);

                        if (userStats[username].gold >= cost) {
                            userStats[username].gold = Math.round((userStats[username].gold - cost) * 10) / 10;
                            userStats[username].level += 1;
                            userStats[username].multiplier = Math.round((userStats[username].multiplier + 0.1) * 10) / 10;
                            
                            saveDatabase();

                            const nextCost = 10 * (userStats[username].level + 1);
                            const replyMessage = `${username} upgraded to lvl ${userStats[username].level}. multiplier, ${userStats[username].multiplier}x. next level costs ${nextCost} gold.`;

                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify(["M", replyMessage]));
                            }
                        } else {
                            const replyMessage = `${username}, you need ${cost} gold to upgrade to lvl ${currentLevel + 1}. you have ${userStats[username].gold} gold.`;
                            
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify(["M", replyMessage]));
                            }
                        }
                    }
                }
            }
        } catch (err) {}
    });

    ws.on('close', () => {
        console.log("Disconnected from server. Reconnecting in 5 seconds...");
        setTimeout(connectToGame, 5000);
    });

    ws.on('error', (err) => {
        console.error("Socket error:", err.message);
    });
}

connectToGame();
