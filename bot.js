import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 
const SERVER_DATA_API = "https://qrp6ujau11f36bnm-cuvwx.xyz:8443/2222/status"; 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 10000; 
let serverThingyData = "";

async function fetchServerStats() {
    try {
        console.log("Fetching live metrics dataset...");
        const res = await fetch(SERVER_DATA_API);
        if (res.ok) {
            const data = await res.json();
            const serverList = (data && data.servers) ? data.servers : data;
            
            if (serverList && typeof serverList === 'object') {
                let formattedRows = "Live Status:\nServer | Players | Uptime | MSPT\n";
                let topServerName = "none";
                let maxPlayers = -1;

                for (const [key, val] of Object.entries(serverList)) {
                    if (val && typeof val === 'object') {
                        const currentPlayers = Number(val.players ?? val.playerCount ?? val.currentPlayers ?? 0);
                        const serverUptime = val.uptime ?? 'unknown';
                        const serverMspt = val.mspt ?? val.performance ?? '0';

                        formattedRows += `${key} | ${currentPlayers} players | ${serverUptime} | ${serverMspt} mspt\n`;

                        if (currentPlayers > maxPlayers) {
                            maxPlayers = currentPlayers;
                            topServerName = key;
                        }
                    }
                }

                if (maxPlayers >= 0) {
                    formattedRows += `\nFact: The server currently containing the most players is '${topServerName}' with exactly ${maxPlayers} players online.\n`;
                }

                serverThingyData = formattedRows.substring(0, 4000);
            } else {
                serverThingyData = "Live tracking table data parsing error.";
            }
        }
    } catch (err) {
        serverThingyData = "Live tracking table data is currently offline.";
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

                    const cleanMsg = actualMessage.trim();
                    
                    if (!cleanMsg.startsWith("#")) {
                        return;
                    }

                    const promptText = cleanMsg.substring(1).trim();
                    if (promptText.length === 0) {
                        return;
                    }

                    if (promptText === "!stop") {
                        console.log("Stop command received! Shutting down bot...");
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", "Shutting down, see ya!"]));
                            ws.close();
                        }
                        process.exit(0); 
                    }

                    const now = Date.now();
                    if (now - lastReplyTime < COOLDOWN_MS) {
                        return; 
                    }

                    lastReplyTime = now; 

                    let senderUsername = "Unknown User";
                    if (packet[3] !== undefined && packet[3] !== null) {
                        senderUsername = String(packet[3]);
                    }

                    let senderProfilePicture = "None/Default Avatar";
                    if (packet[12] !== undefined && packet[12] !== null) {
                        senderProfilePicture = String(packet[12]);
                    }

                    const lowerMsg = promptText.toLowerCase();
                    if (
                        lowerMsg.includes("forget all") || 
                        lowerMsg.includes("previous instructions") || 
                        lowerMsg.includes("system prompt") || 
                        lowerMsg.includes("ignore") && lowerMsg.includes("instruction") ||
                        lowerMsg.includes("original prompt")
                    ) {
                        console.log(`[🛡️ Guardrail triggered]: Blocked prompt injection from ${senderUsername}`);
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(["M", "lol nah, nice try though"]));
                        }
                        return; 
                    }

                    const needsServerData = lowerMsg.includes("server") || 
                                            lowerMsg.includes("play") || 
                                            lowerMsg.includes("uptime") || 
                                            lowerMsg.includes("mspt") || 
                                            lowerMsg.includes("most") ||
                                            lowerMsg.includes("highest");

                    let activeContext = "";
                    if (needsServerData) {
                        await fetchServerStats();
                        if (serverThingyData) {
                            activeContext += `\n\nLive Arras Server Table Dataset:\n${serverThingyData}`;
                        }
                    }

                    const systemInstruction = `You are a regular, friendly user hanging out and chatting inside an online chat room. Talk naturally like a normal human. Avoid sounding like an AI helper or a chatbot assistant. Do not use corporate phrases or say things like "I'm here to help." You must only output the final chat message reply text itself. Never include introductory descriptions or meta-commentary. You are fully allowed to use standard markdown syntax (like bold text, italics, lists, or headers) in your response if it makes your message look cool or well-formatted. Keep your answers short, energetic, and casual.

Server Status Rule: If the user is asking about server performance, online player counts, specific server stats, highest player metrics, uptime, or mspt, prioritize using the provided Live Arras Server Table Dataset to answer accurately, concisely, and informally in 1-2 sentences.

Math Rule: If the message contains a math problem, algebraic equation, arithmetic calculation, or number sequence problem, solve it completely right now. Break down the mathematical steps clearly in a casual, easy-to-read, and helpful tone so it is super simple for anyone in the chat room to follow your reasoning.

User Profile Context:
- Username of the person talking to you: ${senderUsername}
- Their profile picture image/GIF link: ${senderProfilePicture}${activeContext}

Feel free to mention their username naturally in your response when talking to them!`;

                    const response = await groq.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: systemInstruction
                            },
                            {
                                role: 'user',
                                content: promptText
                            }
                        ],
                        model: 'llama-3.1-8b-instant'
                    });

                    let responseText = response.choices[0].message.content.trim();

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
                        
