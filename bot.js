import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"];
const TARGET_NAME = "Cinnamon Bun";

let allUsers = [];
let dmTargetCode = "Unknown";
let chatHue = "Default";
let ws = null;

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

    ws.on('message', (data) => {
        try {
            const packet = JSON.parse(data.toString());
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

setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let messageCount = 0;
    const selfUserObj = allUsers.find(user => user.name && user.name.trim().toLowerCase() === TARGET_NAME.toLowerCase());
    if (selfUserObj) {
        messageCount = selfUserObj.messages ?? 0;
    }

    let totalRoomMessages = allUsers.reduce((sum, u) => sum + (u.messages ?? 0), 0);
    let onlineCount = allUsers.length;
    
    let dominancePercentage = totalRoomMessages > 0 
        ? ((messageCount / totalRoomMessages) * 100).toFixed(1) + "%" 
        : "0.0%";

    const topUsers = allUsers
        .sort((a, b) => (b.messages ?? 0) - (a.messages ?? 0))
        .slice(0, 5);

    const leaderboardText = topUsers.map((user, idx) => {
        const userMsgs = user.messages ?? 0;
        const userDom = totalRoomMessages > 0 ? ((userMsgs / totalRoomMessages) * 100).toFixed(1) + "%" : "0.0%";
        return `${idx + 1}. > ${user.name || "???"} (${userMsgs.toLocaleString()} msgs) - Dominance: ${userDom}`;
    }).join("\n");

    const directoryText = allUsers.map(user => {
        return `> ${user.name || "???"} [#${user.id ?? "??"}] (${(user.messages ?? 0).toLocaleString()} msgs)`;
    }).join("\n");

    const formattedDescription = 
        `DM ID: ${dmTargetCode}\n` +
        `Messages: ${messageCount}\n` +
        `Hue: ${chatHue}\n` +
        `Chat Dominance: ${dominancePercentage} (${messageCount.toLocaleString()}/${totalRoomMessages.toLocaleString()})\n` +
        `Room Status: ${onlineCount} Online\n` +
        `Total Room Activity: ${totalRoomMessages.toLocaleString()} msgs\n` +
        `{{Rule}}\n` +
        `🏆 Top 5 Users (Messages & Dominance):\n${leaderboardText}\n` +
        `{{Rule}}\n` +
        `👥 Online Users Directory:\n${directoryText}`;

    ws.send(JSON.stringify(["B", formattedDescription]));
}, 5000);

connectToGame();
