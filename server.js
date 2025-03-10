const express = require('express');
const http = require('http');
const { setupWebSocket } = require('./api/websocket');
const compress = require('./api/compress');
const download = require('./api/download');

const app = express();
const server = http.createServer(app);

// 设置静态文件服务
app.use(express.static('src'));

// API 路由
app.post('/api/compress', compress);
app.get('/api/download', download);

// 设置 WebSocket
setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 