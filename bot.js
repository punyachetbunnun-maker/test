import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

let ws = null;
let keepAliveInterval = null;

function connectToGame() {
    ws = new WebSocket(SERVER_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    ws.on('open', () => {
        ws.send(JSON.stringify(AUTH_PACKET));

        if (keepAliveInterval) clearInterval(keepAliveInterval);

        keepAliveInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(AUTH_PACKET));
            }
        }, 5000);
    });

    ws.on('close', () => {
        clearInterval(keepAliveInterval);
        setTimeout(connectToGame, 5000);
    });

    ws.on('error', () => {});
}

connectToGame();
