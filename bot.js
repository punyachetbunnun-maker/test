import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 
const LORE_DOC_URL = "https://docs.google.com/document/d/1fJgD3m8acXw8c_oAHkzGoD6cie1bet2016ehQijOkmo/pub?output=txt";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 10000; 
let communityLore = "";

async function fetchCommunityLore() {
    try {
        console.log("Loading community lore and reference materials...");
        const response = await fetch(LORE_DOC_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        communityLore = await response.text();
        console.log("Successfully loaded lore database!");
    } catch (err) {
        console.error("Failed to load lore document:", err.message);
        communityLore = "";
    }
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

                    const systemInstruction = `You are a player inside a game chat room. You must only output the final message reply text itself. Never include introductory sentences, explanations, or meta-commentary. Keep your responses short, concise, and direct (maximum 1 sentence long). If it is a math problem, output only the absolute final answer. Keep your output strictly plain text without markdown, bold syntax, or quotes. Use the following community lore document as your factual background memory to answer questions or talk accurately about custom terms: \n\n${communityLore}`;

                    const response = await groq.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: systemInstruction
                            },
                            {
                                role: 'user',
                                content: actualMessage
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

async function startBot() {
    await fetchCommunityLore();
    connectToGame();
}

startBot();
