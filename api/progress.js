const { EventEmitter } = require('events');

const progressEmitter = new EventEmitter();
const tasks = new Map();

function sendEvent(res, event) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

module.exports = async (req, res) => {
    const taskId = req.query.taskId;
    
    if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
    }

    // 设置 SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // 发送初始连接确认
    sendEvent(res, { type: 'connected', taskId });

    // 监听任务进度
    const progressHandler = (data) => {
        if (data.taskId === taskId) {
            sendEvent(res, data);
        }
    };

    progressEmitter.on('progress', progressHandler);

    // 监听连接关闭
    req.on('close', () => {
        progressEmitter.removeListener('progress', progressHandler);
        tasks.delete(taskId);
    });

    // 如果任务已完成，发送完成事件
    const taskResult = tasks.get(taskId);
    if (taskResult) {
        sendEvent(res, {
            type: 'complete',
            taskId,
            result: taskResult
        });
        tasks.delete(taskId);
    }
};

// 导出用于更新进度的函数
module.exports.updateProgress = (taskId, progress) => {
    progressEmitter.emit('progress', {
        type: 'progress',
        taskId,
        progress
    });
};

// 导出用于设置任务完成的函数
module.exports.setTaskComplete = (taskId, result) => {
    tasks.set(taskId, result);
    progressEmitter.emit('progress', {
        type: 'complete',
        taskId,
        result
    });
};

// 导出用于设置任务错误的函数
module.exports.setTaskError = (taskId, error) => {
    progressEmitter.emit('progress', {
        type: 'error',
        taskId,
        error: error.message || 'Compression failed'
    });
};