const tasks = new Map();

// 用于存储任务状态的函数
function setTaskStatus(taskId, status, data = {}) {
    tasks.set(taskId, { status, ...data });
    
    // 如果任务完成或出错，设置 5 分钟后自动清理
    if (status === 'completed' || status === 'error') {
        setTimeout(() => {
            tasks.delete(taskId);
        }, 5 * 60 * 1000);
    }
}

// 获取任务状态的函数
function getTaskStatus(taskId) {
    return tasks.get(taskId) || { status: 'error', error: 'Task not found' };
}

// 状态检查端点
module.exports = async (req, res) => {
    const taskId = req.query.taskId;
    
    if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
    }

    const status = getTaskStatus(taskId);
    res.json(status);
};

// 导出用于更新任务状态的函数
module.exports.setTaskStatus = setTaskStatus;
module.exports.getTaskStatus = getTaskStatus; 