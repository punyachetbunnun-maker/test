import http from 'http';
import './bot.js';

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot status: Active\n');
}).listen(process.env.PORT || 3000, () => {
    console.log("Web server online.");
});
