import WebSocket from 'ws';
import { HfInference } from '@huggingface/inference';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const hf = new HfInference(process.env.HF_API_TOKEN);

let ws = null;

async function generateWithRetry(inputs, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await hf.textGeneration({
                model: 'Qwen/Qwen2.5-7B-Instruct',
                inputs: inputs,
                parameters: {
                    max_new_tokens: 50,
                    temperature: 0.7
                }
            });
            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`AI fetch failed. Retrying... (${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, 1500));
        }
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
                let foundHi = false;
                let actualMessage = "";

                for (let i = 1; i < packet.length; i++) {
                    if (typeof packet[i] === "string") {
                        const cleanStr = packet[i].trim().toLowerCase();
                        if (cleanStr === "hi" || cleanStr.split(" ").includes("hi")) {
                            foundHi = true;
                            actualMessage = packet[i];
                            break;
                        }
                    }
                }

                if (foundHi) {
                    try {
                        const prompt = `<|im_start|>system\nYou are a casual player in a video game chat room. Reply to the user message in exactly 1 short sentence. Do not use quotes or markdown.<|im_end|>\n<|im_start|>user\n${actualMessage}<|im_end|>\n<|im_start|>assistant\n`;
                        const response = await generateWithRetry(prompt);

                        let aiReply = response.generated_text;
                        const assistantIndex = aiReply.lastIndexOf('<|im_start|>assistant\n');
                        if (assistantIndex !== -1) {
                            aiReply = aiReply.substring(assistantIndex + 22).trim();
                        }
                        
                        aiReply = aiReply.replace(/<\|im_end\|>/g, '').trim();

                        if (ws && ws.readyState === WebSocket.OPEN && aiReply.length > 0) {
                            ws.send(JSON.stringify(["M", aiReply]));
                        }
                    } catch (aiError) {
                        console.error("AI Generation Error:", aiError.message);
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
