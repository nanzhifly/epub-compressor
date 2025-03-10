const WebSocket = require('ws');
const url = require('url');

let wss;

function setupWebSocket(server) {
    // 在生产环境中，我们使用 Vercel 的无服务器函数，不需要创建 WebSocket 服务器
    if (process.env.NODE_ENV === 'production') {
        console.log('WebSocket server not started in production');
        return;
    }

    wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        clientTracking: true
    });
    
    wss.on('connection', (ws, req) => {
        try {
            const taskId = url.parse(req.url, true).query.taskId;
            if (!taskId) {
                ws.close(1003, 'Task ID is required');
                return;
            }
            
            ws.taskId = taskId;
            ws.isAlive = true;

            console.log(`Client connected with taskId: ${taskId}`);

            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log(`Received message from ${taskId}:`, data);
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for ${taskId}:`, error);
            });

            ws.on('close', () => {
                console.log(`Client disconnected: ${taskId}`);
            });
        } catch (error) {
            console.error('Error in WebSocket connection:', error);
            ws.close(1011, 'Internal Server Error');
        }
    });

    // 清理断开的连接
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log(`Terminating inactive connection: ${ws.taskId}`);
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    // 错误处理
    wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
    });
}

function sendProgress(taskId, progress) {
    if (!wss || process.env.NODE_ENV === 'production') {
        console.log(`Progress update for ${taskId}: ${progress}%`);
        return;
    }

    wss.clients.forEach((client) => {
        if (client.taskId === taskId && client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'progress',
                    data: {
                        progress,
                        taskId
                    }
                }));
            } catch (error) {
                console.error(`Failed to send progress to ${taskId}:`, error);
            }
        }
    });
}

module.exports = {
    setupWebSocket,
    sendProgress
}; 