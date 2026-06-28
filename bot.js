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

                    lastReplyTime = now; 

                    const lowerMsg = actualMessage.toLowerCase();
                    const needsLore = lowerMsg.includes("ttf") || 
                                      lowerMsg.includes("dkg") || 
                                      lowerMsg.includes("lore") || 
                                      lowerMsg.includes("dragon");

                    let loreContextString = "";
                    if (needsLore && communityLore) {
                        loreContextString = `\n\nCommunity lore reference document to use for answering:\n${communityLore}`;
                    }

                    const systemInstruction = `You are a regular, friendly player hanging out and chatting inside an online multiplayer game chat room. Talk naturally like a normal human gamer. Avoid sounding like an AI helper or an official chatbot assistant. Do not use corporate, polite customer support phrases or say things like "I'm here to help." You must only output the final chat message reply text itself. Never include introductory descriptions or meta-commentary. Keep your output strictly plain text without markdown, bold syntax, symbols like asterisks, or quotes.

Rules for responding:
1. If the message is a math problem, algebraic equation, quadratic formula question, or numeric question, solve it completely and explain the steps in a casual, conversational, and helpful tone so it's super easy to follow. 
2. If the message asks about community lore (such as ttf, dkg, dragon king gaming), share the details naturally from the provided document as a fellow player who knows the history (2-3 sentences max).
3. If it is regular chat unrelated to math or lore, reply with a short, friendly, and informal comment (maximum 1 sentence long). Sound energetic, happy, and chill. Do not bring up lore, ttf, or dkg unless specifically asked.${loreContextString}`;

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
