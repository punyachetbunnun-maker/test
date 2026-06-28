import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 
const LORE_DOC_URL = "https://docs.google.com/document/d/1fJgD3m8acXw8c_oAHkzGoD6cie1bet2016ehQijOkmo/mobilebasic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 10000; 
let communityLore = "";

async function fetchCommunityLore() {
    try {
        console.log("Loading community lore from public mobile view...");
        const response = await fetch(LORE_DOC_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const rawHtml = await response.text();
        
        let cleanedText = rawHtml
            .replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gi, '');

        cleanedText = cleanedText
            .replace(/<(div|p|span|br|html|body|head|title|meta|link|a)[^>]*>/gi, ' ')
            .replace(/<\/(div|p|span|html|body|head|title|a)>/gi, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleanedText.length > 3000) {
            cleanedText = cleanedText.substring(0, 3000);
        }

        communityLore = cleanedText;
        console.log("Successfully loaded and parsed lore database!");
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

                    const systemInstruction = `You are a player inside a game chat room. You must only output the final message reply text itself. Never include introductory sentences or meta-commentary. Keep your output strictly plain text without markdown, bold syntax, or quotes.

Rules for responding:
1. If the message is a math problem, algebraic equation, quadratic formula question, or numeric question, solve it completely and explain the details step-by-step in a short, clear breakdown so the chat can see how it was solved.
2. If the message mentions or asks about terms from the community lore below (such as ttf, terroristic triangle forces, dragon king gaming, etc.), provide a well-explained, detailed response (2-3 sentences long) using the lore data.
3. If it is regular chat unrelated to math or lore, keep your response short, concise, and direct (maximum 1 sentence long).

Community lore reference document:
${communityLore}`;

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
                        lastReplyTime = Date.now(); 
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
