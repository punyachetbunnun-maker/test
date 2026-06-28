import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const userGold = {};

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

                    if (cleanMessage === "increase") {
                        if (!userGold[username]) {
                            userGold[username] = 1;
                        }

                        const gain = Math.random() < 0.5 ? 1 : 2;
                        userGold[username] += gain;

                        const replyMessage = `${username} gained ${gain} gold now, ${userGold[username]} gold.`;

                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", replyMessage]));
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
