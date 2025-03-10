const path = require('path');
const os = require('os');
const fs = require('fs');
const fsPromises = require('fs').promises;

// 验证文件名安全性
function isValidFileName(fileName) {
    return /^[a-zA-Z0-9-_]+\.epub$/.test(fileName) && 
           !fileName.includes('..') && 
           !fileName.includes('/');
}

module.exports = async (req, res) => {
    try {
        const fileName = req.query.file;

        // 基本验证
        if (!fileName) {
            return res.status(400).json({ error: 'File name is required' });
        }

        // 文件名安全性检查
        if (!isValidFileName(fileName)) {
            return res.status(400).json({ error: 'Invalid file name' });
        }

        // 获取文件路径
        const filePath = path.join(os.tmpdir(), fileName);

        try {
            // 检查文件是否存在
            await fsPromises.access(filePath);
        } catch (error) {
            return res.status(404).json({ error: 'File not found' });
        }

        // 设置响应头
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // 流式传输文件
        const fileStream = fs.createReadStream(filePath);
        
        // 错误处理
        fileStream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error' });
            }
            res.end();
        });

        // 文件传输完成后清理
        fileStream.on('end', async () => {
            try {
                await fsPromises.unlink(filePath);
            } catch (error) {
                console.error('Error deleting temporary file:', error);
            }
        });

        // 开始传输
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
        }
        res.end();
    }
}; 