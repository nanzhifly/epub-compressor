const WebSocket = require('ws');
const url = require('url');

let wss;

function setupWebSocket(server) {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws, req) => {
        const taskId = url.parse(req.url, true).query.taskId;
        
        ws.taskId = taskId;
        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('error', console.error);
    });

    // 清理断开的连接
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });
}

function sendProgress(taskId, progress) {
    if (!wss) return;

    wss.clients.forEach((client) => {
        if (client.taskId === taskId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'progress',
                data: {
                    progress,
                    taskId
                }
            }));
        }
    });
}

module.exports = {
    setupWebSocket,
    sendProgress
}; 