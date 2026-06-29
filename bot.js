import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 
const LORE_DOC_URL = "https://docs.google.com/document/d/1fJgD3m8acXw8c_oAHkzGoD6cie1bet2016ehQijOkmo/mobilebasic";
const SERVER_DATA_URL = "https://trappercloser.github.io/Arras-Server-Thingy/";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 10000; 
let communityLore = "";
let serverThingyData = "";

async function fetchExternalData() {
    try {
        console.log("Loading community lore...");
        const loreRes = await fetch(LORE_DOC_URL);
        if (loreRes.ok) {
            let html = await loreRes.text();
            communityLore = html
                .replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gi, '')
                .replace(/<(div|p|span|br|html|body|head|title|meta|link|a)[^>]*>/gi, ' ')
                .replace(/<\/(div|p|span|html|body|head|title|a)>/gi, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (communityLore.length > 3000) communityLore = communityLore.substring(0, 3000);
        }
    } catch (err) {
        console.error("Failed loading lore document:", err.message);
    }

    try {
        console.log("Loading Arras Server Thingy data...");
        const serverRes = await fetch(SERVER_DATA_URL);
        if (serverRes.ok) {
            let html = await serverRes.text();
            
            // Clean table code keeping rows on separate lines for better reading
            let cleanedData = html
                .replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gi, '')
                .replace(/<\/tr>/gi, '\n') // Put every table row on a new line
                .replace(/<[^>]+>/g, ' ')  // Strip all other HTML elements
                .replace(/&nbsp;/g, ' ')
                .replace(/[ \t]+/g, ' ')   // Collapse extra spaces but keep newlines
                .trim();

            if (cleanedData.length > 4000) cleanedData = cleanedData.substring(0, 4000);
            serverThingyData = cleanedData;
            console.log("Successfully loaded and formatted Live Server Table!");
        }
    } catch (err) {
        console.error("Failed loading Server Thingy page:", err.message);
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
                    if (cleanMsg.length === 0) {
                        return;
                    }

                    if (cleanMsg === "!stop") {
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

                    const lowerMsg = cleanMsg.toLowerCase();
                    const needsLore = lowerMsg.includes("ttf") || 
                                      lowerMsg.includes("dkg") || 
                                      lowerMsg.includes("lore") || 
                                      lowerMsg.includes("dragon");
                    
                    const needsServerData = lowerMsg.includes("server") || 
                                            lowerMsg.includes("player") || 
                                            lowerMsg.includes("uptime") || 
                                            lowerMsg.includes("mspt") || 
                                            lowerMsg.includes("#");

                    let activeContext = "";
                    if (needsLore && communityLore) {
                        activeContext += `\n\nCommunity lore reference document:\n${communityLore}`;
                    }
                    if (needsServerData && serverThingyData) {
                        activeContext += `\n\nLive Server Table data (Server, Players, Uptime, MSPT):\n${serverThingyData}`;
                    }

                    const systemInstruction = `You are a regular, friendly user hanging out and chatting inside an online chat room. Talk naturally like a normal human. Avoid sounding like an AI helper or a chatbot assistant. Do not use corporate phrases or say things like "I'm here to help." You must only output the final chat message reply text itself. Never include introductory descriptions or meta-commentary. Keep your output strictly plain text without markdown, bold syntax, symbols like asterisks, or quotes.

Rules for responding:
1. If the message is a math problem, algebraic equation, quadratic formula question, or numeric question, solve it completely and explain the steps in a casual, conversational, and helpful tone so it's super easy to follow. 
2. If the message asks about community lore (such as ttf, dkg, dragon king gaming), share the details naturally from the provided document as a normal user who knows the history (2-3 sentences max). Stick strictly to the facts written in the text. Do not invent any fake server events, guild raids, or countdowns.
3. If the message asks about active servers, player counts, uptime, or mspt stats, use the provided Live Server Table dataset to answer accurately in 1-2 friendly sentences as a normal user checking the dashboard status.
4. If it is regular chat unrelated to math, servers, or lore, reply with a short, friendly, and informal comment (maximum 1 sentence long). Sound energetic, happy, and chill. Do not bring up data context unless specifically asked.

Additional facts and context guidelines:
- Your name is cinnamon bun.
- The chat room you are currently on is https://vercel-tinkering.vercel.app/index.html.
- The developer of this current chatroom is Testing.
- The historical lineage of developers for the old arras verify is MLG, then Flowey, and then Testing.${activeContext}`;

                    const response = await groq.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: systemInstruction
                            },
                            {
                                role: 'user',
                                content: cleanMsg
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
    await fetchExternalData();
    connectToGame();
}

startBot();
                    
