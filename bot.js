ws.on('message', async (data) => {
        try {
            // Convert raw buffer data to a visible string
            const rawString = data.toString();
            console.log("RAW SERVER DATA:", rawString);

            const packet = JSON.parse(rawString);
            
            if (Array.isArray(packet) && packet[0] === "M") {
                let rawChatString = "";
                
                if (typeof packet[2] === "string") {
                    rawChatString = packet[2];
                } else if (typeof packet[1] === "string") {
                    rawChatString = packet[1];
                }
                
                if (rawChatString.trim().length > 0) {
                    let actualMessage = rawChatString;
                    
                    const colonIndex = rawChatString.indexOf(": ");
                    if (colonIndex !== -1) {
                        actualMessage = rawChatString.substring(colonIndex + 2);
                    }

                    const cleanMessage = actualMessage.trim().toLowerCase();

                    if (cleanMessage === "hi" || cleanMessage.split(" ").includes("hi")) {
                        try {
                            const response = await hf.textGeneration({
                                model: 'Mistralai/Mistral-7B-Instruct-v0.2',
                                inputs: `<s>[INST] You are a casual player in a video game chat room. Reply to this comment: "${actualMessage}". Keep your answer short, casual, and exactly 1 sentence long. Do not use quotes or markdown. [/INST]`,
                                parameters: {
                                    max_new_tokens: 50,
                                    temperature: 0.7
                                }
                            });

                            let aiReply = response.generated_text;
                            const instIndex = aiReply.lastIndexOf('[/INST]');
                            if (instIndex !== -1) {
                                aiReply = aiReply.substring(instIndex + 7).trim();
                            }

                            if (ws && ws.readyState === WebSocket.OPEN && aiReply.length > 0) {
                                ws.send(JSON.stringify(["M", aiReply]));
                            }
                        } catch (aiError) {
                            console.error("AI Generation Error:", aiError.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to parse incoming packet:", err.message);
        }
    });
