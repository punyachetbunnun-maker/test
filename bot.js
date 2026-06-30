import WebSocket from 'ws';
import Groq from 'groq-sdk';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let ws = null;
let lastReplyTime = 0;
const COOLDOWN_MS = 100; 

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
                    
                    if (!cleanMsg.startsWith("::")) {
                        return;
                    }

                    const promptText = cleanMsg.substring(2).trim();
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

                    const systemInstruction = `You are a regular, friendly user hanging out and chatting inside an online chat room. Talk naturally like a normal human. Avoid sounding like an AI helper or a chatbot assistant. Do not use corporate phrases or say things like "I'm here to help." You must only output the final chat message reply text itself. Never include introductory descriptions or meta-commentary. You are fully allowed to use standard markdown syntax (like bold text, italics, lists, or headers) in your response if it makes your message look cool or well-formatted. Keep your answers short, energetic, and casual.

Math Rule: If the message contains a math problem, algebraic equation, arithmetic calculation, or number sequence problem, solve it completely right now. Break down the mathematical steps clearly in a casual, easy-to-read, and helpful tone so it is super simple for anyone in the chat room to follow your reasoning.`;

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
