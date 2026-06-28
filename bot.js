import WebSocket from 'ws';
import { GoogleGenAI } from '@google/genai';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 10000; 

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
                let incomingMessage = "";
                
                if (typeof packet[2] === "string") {
                    incomingMessage = packet[2];
                } else if (typeof packet[1] === "string") {
                    incomingMessage = packet[1];
                }
                
                if (incomingMessage.trim().length > 0) {
                    const now = Date.now();
                    if (now - lastReplyTime < COOLDOWN_MS) {
                        return; 
                    }

                    lastReplyTime = now; 

                    try {
                        const response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `You are a casual player in a game chat room. Reply to this message: "${incomingMessage}". Give a longer, detailed response (2-3 sentences long) that sounds natural and conversational. Do not include any quotes, markdown formatting, or bot-like phrasing.`,
                        });
                        
                        const aiReply = response.text.trim();
                        
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", aiReply]));
                        }
                    } catch (aiError) {
                        console.error("Gemini API Error details:", aiError.message);
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
