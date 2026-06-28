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
const COOLDOWN_MS = 10000; 

function getAIInstance() {
    if (API_KEYS.length === 0) {
        console.error("Error: No valid API keys found in environment variables!");
        return null;
    }
    const key = API_KEYS[currentKeyIndex];
    return new GoogleGenAI({ apiKey: key });
}

function rotateKey() {
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

                    let responseText = null;
                    let attempts = 0;

                    while (attempts < API_KEYS.length) {
                        try {
                            const ai = getAIInstance();
                            if (!ai) break;

                            const response = await ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: `You are a player in a game chat room. Analyze this incoming message: "${actualMessage}". If the message is a math problem, algebraic equation, or numeric question, solve it completely and accurately. If it is regular chat, reply in a very short, snappy, conversational way (under 10 words). Keep your output entirely as plain text. Do not use markdown, bold syntax, bullet points, or quotes.`,
                            });

                            responseText = response.text.trim();
                            rotateKey(); 
                            break; 

                        } catch (aiError) {
                            console.error(`Key index ${currentKeyIndex} failed:`, aiError.message);
                            
                            const isRateLimited = aiError.message.includes("429") || aiError.message.includes("RESOURCE_EXHAUSTED");
                            const isUnavailable = aiError.message.includes("503") || aiError.message.includes("UNAVAILABLE");

                            if (isRateLimited || isUnavailable) {
                                console.log("Key is full or unavailable. Switching to next key immediately...");
                                rotateKey(); 
                                attempts++;
                            } else {
                                rotateKey(); 
                                break;
                            }
                        }
                    }

                    if (responseText && ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(["M", responseText]));
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
