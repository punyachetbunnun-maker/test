import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const PHRASES = [
    "hi",
    "hello",
    "Eh?",
    "Cinnamon Bun",
    "67",
    "spin",
    "test",
    "online",
    "active",
    "running"
];

let ws = null;
let chatInterval = null;

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

        if (chatInterval) clearInterval(chatInterval);
        chatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const randomIndex = Math.floor(Math.random() * PHRASES.length);
                const randomMessage = PHRASES[randomIndex];
                ws.send(JSON.stringify(["M", randomMessage]));
            }
        }, 10000);
    });

    ws.on('message', (data) => {
        try {
            const packet = JSON.parse(data.toString());
        } catch (err) {}
    });

    ws.on('close', () => {
        console.log("Disconnected from server. Reconnecting in 5 seconds...");
        if (chatInterval) {
            clearInterval(chatInterval);
            chatInterval = null;
        }
        setTimeout(connectToGame, 5000);
    });

    ws.on('error', (err) => {
        console.error("Socket error:", err.message);
    });
}

connectToGame();
if (typeof packet[i] === "string") {
                        const checkStr = packet[i].toLowerCase();
                        if (checkStr === "hi" || checkStr === "hello") {
                            messageText = checkStr;
                            break;
                        }
                    }
                }
                
                if (messageText === "hi" || messageText === "hello") {
                    ws.send(JSON.stringify(["M", "hi"]));
                }
            }
        } catch (err) {}
    });

    ws.on('close', () => {
        console.log("Disconnected from server. Reconnecting in 5 seconds...");
        if (chatInterval) {
            clearInterval(chatInterval);
            chatInterval = null;
        }
        setTimeout(connectToGame, 5000);
    });

    ws.on('error', (err) => {
        console.error("Socket error:", err.message);
    });
}

connectToGame();
