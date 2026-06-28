import WebSocket from 'ws';
import { GoogleGenAI } from '@google/genai';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const ALL_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
];

const API_KEYS = ALL_KEYS.filter(key => key && key.trim().length > 0);

let currentKeyIndex = 0;
let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 12000; 

function getAIInstance() {
    if (API_KEYS.length === 0) {
        console.error("Error: No valid API keys found in environment variables!");
        return null;
    }
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return new GoogleGenAI({ apiKey: key });
}

function rotateKeyOnError() {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
}

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
                let rawChatString = "";
                
                if (typeof packet[6] === "string") {
                    rawChatString = packet[6];
                }
                
                if (rawChatString.trim().length > 0) {
                    let actualMessage = rawChatString;
                    const colonIndex = rawChatString.indexOf(": ");
                    if (colonIndex !== -1) {
                        actualMessage = rawChatString.substring(colonIndex + 2);
                    }

                    if (actualMessage.trim().length === 0) {
                        return;
                    }

                    const now = Date.now();
                    if (now - lastReplyTime < COOLDOWN_MS) {
                        return; 
                    }

                    lastReplyTime = now; 

                    try {
                        const ai = getAIInstance();
                        if (!ai) return;

                        const response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `You are a casual player in a game chat room. Reply to this message: "${actualMessage}". Give a longer, detailed response (2-3 sentences long) that sounds natural and conversational. Do not include any quotes, markdown formatting, or bot-like phrasing.`,
                        });
                        
                        const aiReply = response.text.trim();
                        
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", aiReply]));
                        }
                    } catch (aiError) {
                        console.error("Gemini API Error details:", aiError.message);
                        if (aiError.message.includes("503") || aiError.message.includes("UNAVAILABLE")) {
                            rotateKeyOnError();
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
