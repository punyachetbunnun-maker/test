import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

                    const response = await groq.chat.completions.create({
                        messages: [
                            {
                                role: 'user',
                                content: `You are a player in a game chat room. Analyze this incoming message: "${actualMessage}". If the message is a math problem, algebraic equation, or numeric question, solve it completely and accurately. If it is regular chat, reply with a longer, detailed response (2-3 sentences long) that sounds natural, casual, and conversational. Keep your output entirely as plain text. Do not use markdown, bold syntax, bullet points, or quotes.`
                            }
                        ],
                        model: 'llama-3.1-8b-instant'
                    });

                    const responseText = response.choices[0].message.content.trim();

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
