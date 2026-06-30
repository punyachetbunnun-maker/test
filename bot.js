import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

function connectToGame() {
    console.log("Connecting to server to monitor chat structures...");
    const ws = new WebSocket(SERVER_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    ws.on('open', () => {
        console.log("Connected! Monitoring message packets...");
        ws.send(JSON.stringify(AUTH_PACKET));
    });

    ws.on('message', (data) => {
        try {
            const packet = JSON.parse(data.toString());
            
            if (Array.isArray(packet) && packet[0] === "M") {
                console.log("\n========================================");
                console.log("🆕 CHAT PACKET DETECTED!");
                console.log("========================================");
                
                // Prints the entire raw array on one line
                console.log("Raw Packet Array:", JSON.stringify(packet));
                console.log("----------------------------------------");
                
                // Loops through and labels every index position dynamically
                packet.forEach((item, index) => {
                    console.log(`packet[${index}]:`, typeof item === 'object' ? JSON.stringify(item) : item);
                });
                
                console.log("========================================\n");
            }
        } catch (err) {
            console.error("Failed to parse incoming websocket string data:", err.message);
        }
    });

    ws.on('close', () => {
        console.log("Disconnected. Reconnecting in 3 seconds...");
        setTimeout(connectToGame, 3000);
    });

    ws.on('error', (err) => {
        console.error("Diagnostic socket error:", err.message);
    });
}

connectToGame();
