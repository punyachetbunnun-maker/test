import WebSocket from 'ws';
import { GoogleGenAI } from '@google/genai';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    ws.on('message', async (data) => {
        try {
            const packet = JSON.parse(data.toString());
            
            if (Array.isArray(packet) && packet[0] === "M") {
                let messageText = "";
                
                for (let i = 1; i < packet.length; i++) {
                    if (typeof packet[i] === "string") {
                        const checkStr = packet[i].toLowerCase();
                        if (checkStr === "h") {
                            messageText = checkStr;
                            break;
                        }
                    }
                }
                
                if (messageText === "h") {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: 'Give a very short, friendly, single-sentence greeting to a player in a game chat. Do not include any quotes or extra formatting.',
                    });
                    
                    const aiReply = response.text.trim();
                    
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(["M", aiReply]));
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
