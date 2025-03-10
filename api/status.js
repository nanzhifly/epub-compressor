const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TaskError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.status = 400;
    }
}

// Task management
const taskManager = {
    // Maximum task lifetime (5 minutes)
    MAX_TASK_AGE: 5 * 60 * 1000,

    // Get task directory
    getTaskDir() {
        return path.join(os.tmpdir(), 'epub-tasks');
    },

    // Get task file path
    getTaskPath(taskId) {
        return path.join(this.getTaskDir(), `${taskId}.json`);
    },

    // Initialize task directory
    async init() {
        try {
            await fs.mkdir(this.getTaskDir(), { recursive: true });
        } catch (error) {
            console.error('Failed to create task directory:', error);
        }
    },

    // Add or update task
    async setTask(taskId, status, data = {}) {
        const task = {
            status,
            timestamp: Date.now(),
            ...data
        };

        try {
            await fs.writeFile(
                this.getTaskPath(taskId),
                JSON.stringify(task),
                'utf8'
            );
        } catch (error) {
            console.error('Failed to save task:', error);
            throw new TaskError('Failed to save task', 'SAVE_FAILED');
        }
    },

    // Get task status
    async getTask(taskId) {
        try {
            const data = await fs.readFile(this.getTaskPath(taskId), 'utf8');
            const task = JSON.parse(data);

            // Check if task has expired
            if (Date.now() - task.timestamp > this.MAX_TASK_AGE) {
                await this.deleteTask(taskId);
                throw new TaskError('Task expired', 'TASK_EXPIRED');
            }

            return task;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new TaskError('Task not found', 'TASK_NOT_FOUND');
            }
            if (error instanceof TaskError) {
                throw error;
            }
            console.error('Failed to read task:', error);
            throw new TaskError('Failed to read task', 'READ_FAILED');
        }
    },

    // Delete task
    async deleteTask(taskId) {
        try {
            await fs.unlink(this.getTaskPath(taskId));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to delete task:', error);
            }
        }
    },

    // Clean up expired tasks
    async cleanup() {
        try {
            const files = await fs.readdir(this.getTaskDir());
            const now = Date.now();

            for (const file of files) {
                try {
                    const taskPath = path.join(this.getTaskDir(), file);
                    const data = await fs.readFile(taskPath, 'utf8');
                    const task = JSON.parse(data);

                    if (now - task.timestamp > this.MAX_TASK_AGE) {
                        await fs.unlink(taskPath);
                    }
                } catch (error) {
                    console.error(`Failed to process task file ${file}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup tasks:', error);
        }
    }
};

// Initialize task manager
taskManager.init();

// Start cleanup interval
setInterval(() => taskManager.cleanup(), 60 * 1000);

// Status check endpoint
module.exports = async (req, res) => {
    try {
        const taskId = req.query.taskId;
        
        if (!taskId) {
            throw new TaskError('Task ID is required', 'MISSING_TASK_ID');
        }

        const task = await taskManager.getTask(taskId);
        
        res.sendSuccess({
            taskId,
            status: task.status,
            progress: task.progress || 0,
            ...(task.result && { result: task.result }),
            ...(task.error && { error: task.error })
        });
    } catch (error) {
        res.sendError(error);
    }
};

// Export task management functions
module.exports.setTaskStatus = taskManager.setTask.bind(taskManager);
module.exports.getTaskStatus = taskManager.getTask.bind(taskManager); 