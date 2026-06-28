import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "GU111B13_EZ"]; 

let ws = null;
let lastBotReply = "";

async function generateAIResponse(userMessage) {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [
                    {
                        role: "system",
                        content: "You are a casual player in a video game chat room. Reply to the user message in exactly 1 short sentence. Do not use quotes, hashtags, or markdown formatting."
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
        console.error("AI Generation Error:", err.message);
        return "";
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

                for (let i = 1; i < packet.length; i++) {
                    if (typeof packet[i] === "string" && packet[i].includes(":")) {
                        rawChatString = packet[i];
                        break;
                    }
                }

                if (!rawChatString) {
                    for (let i = 1; i < packet.length; i++) {
                        if (typeof packet[i] === "string" && packet[i].trim().length > 2) {
                            rawChatString = packet[i];
                            break;
                        }
                    }
                }

                if (rawChatString && rawChatString.trim().length > 0) {
                    let actualMessage = rawChatString;
                    const colonIndex = rawChatString.indexOf(":");
                    
                    if (colonIndex !== -1) {
                        actualMessage = rawChatString.substring(colonIndex + 1).trim();
                    }

                    if (actualMessage.length > 0 && actualMessage !== lastBotReply) {
                        const aiReply = await generateAIResponse(actualMessage);
                        if (ws && ws.readyState === WebSocket.OPEN && aiReply.length > 0) {
                            lastBotReply = aiReply;
                            ws.send(JSON.stringify(["M", aiReply]));
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
