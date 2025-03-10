const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const os = require('os');
const fs = require('fs');
const sharp = require('sharp');
const { promisify } = require('util');
const { setTaskStatus } = require('./status');

// 优化的压缩配置
const optimizedCompressionConfig = {
    text: {
        low: { level: 6, method: 'DEFLATE', dictionary: true },
        medium: { level: 8, method: 'DEFLATE', dictionary: true },
        high: { level: 9, method: 'DEFLATE', dictionary: true }
    },
    images: {
        low: { 
            quality: 80,
            method: 'DEFLATE',
            resize: false,
            format: 'preserve'
        },
        medium: { 
            quality: 70,
            method: 'DEFLATE',
            resize: true,
            maxWidth: 1500,
            maxHeight: 1500,
            format: 'auto'
        },
        high: { 
            quality: 60,
            method: 'DEFLATE',
            resize: true,
            maxWidth: 1200,
            maxHeight: 1200,
            format: 'auto'
        }
    },
    fonts: {
        low: { level: 5, method: 'DEFLATE' },
        medium: { level: 7, method: 'DEFLATE' },
        high: { level: 9, method: 'DEFLATE' }
    },
    others: {
        low: { level: 3, method: 'DEFLATE' },
        medium: { level: 5, method: 'DEFLATE' },
        high: { level: 7, method: 'DEFLATE' }
    }
};

// 配置文件上传
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/epub+zip' || 
            path.extname(file.originalname).toLowerCase() === '.epub') {
            cb(null, true);
        } else {
            cb(new Error('Only EPUB files are allowed'));
        }
    }
}).single('file');

// 进度监控类
class CompressionProgress {
    constructor() {
        this.total = 0;
        this.processed = 0;
        this.callbacks = new Set();
    }
    
    update(processed) {
        this.processed = processed;
        this.notifyProgress();
    }
    
    notifyProgress() {
        const progress = (this.processed / this.total) * 100;
        this.callbacks.forEach(cb => cb(progress));
    }
}

// 智能文件类型检测
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    // 文本文件
    if (['.html', '.xhtml', '.htm', '.css', '.xml', '.opf', '.ncx', '.txt', '.js'].includes(ext)) {
        return 'text';
    }
    // 图片文件
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
        return 'images';
    }
    // 字体文件
    if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        return 'fonts';
    }
    return 'others';
}

// 检测图片格式
async function detectImageFormat(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        return metadata.format;
    } catch (error) {
        console.error('Image format detection error:', error);
        return null;
    }
}

// 优化图片处理
async function optimizeImage(buffer, config) {
    try {
        let sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();
        
        // 如果配置要求调整大小且图片超过最大尺寸
        if (config.resize && 
            (metadata.width > config.maxWidth || metadata.height > config.maxHeight)) {
            sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // 根据图片格式选择最佳压缩方法
        if (config.format === 'auto') {
            switch (metadata.format) {
                case 'jpeg':
                    return await sharpInstance
                        .jpeg({ quality: config.quality, progressive: true })
                        .toBuffer();
                case 'png':
                    return await sharpInstance
                        .png({ quality: config.quality, compressionLevel: 9, palette: true })
                        .toBuffer();
                case 'webp':
                    return await sharpInstance
                        .webp({ quality: config.quality, effort: 6 })
                        .toBuffer();
                default:
                    return await sharpInstance
                        .jpeg({ quality: config.quality, progressive: true })
                        .toBuffer();
            }
        } else {
            // 保持原始格式
            switch (metadata.format) {
                case 'jpeg':
                    return await sharpInstance
                        .jpeg({ quality: config.quality, progressive: true })
                        .toBuffer();
                case 'png':
                    return await sharpInstance
                        .png({ quality: config.quality, compressionLevel: 9 })
                        .toBuffer();
                default:
                    return buffer;
            }
        }
    } catch (error) {
        console.error('Image optimization error:', error);
        return buffer; // 如果优化失败，返回原图
    }
}

// 压缩EPUB文件
async function compressEpub(buffer, level, taskId) {
    try {
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();
        const totalEntries = entries.length;
        let processedEntries = 0;
        let totalSaved = 0;

        for (const entry of entries) {
            if (entry.isDirectory) {
                processedEntries++;
                continue;
            }

            const fileType = getFileType(entry.entryName);
            const config = optimizedCompressionConfig[fileType][level];
            const entryData = entry.getData();
            const originalSize = entryData.length;

            let optimizedData;
            if (fileType === 'images') {
                // 图片优化处理
                optimizedData = await optimizeImage(entryData, config);
            } else {
                // 其他文件直接使用配置的压缩级别
                optimizedData = entryData;
            }

            // 更新文件
            zip.updateFile(entry.entryName, optimizedData, '', {
                compression: config.method === 'DEFLATE' ? 8 : 0,
                compressionLevel: config.level || 0
            });

            // 计算节省的空间
            const newSize = optimizedData.length;
            totalSaved += Math.max(0, originalSize - newSize);

            processedEntries++;
            // 更新任务进度
            setTaskStatus(taskId, 'processing', {
                progress: Math.round((processedEntries / totalEntries) * 100)
            });
        }

        return {
            buffer: zip.toBuffer(),
            totalSaved
        };
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress EPUB file');
    }
}

// 错误处理类
class CompressionError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

function handleCompressionError(error, res) {
    console.error('Compression error:', error);
    
    if (error instanceof CompressionError) {
        res.status(400).json({
            error: error.message,
            code: error.code,
            details: error.details
        });
    } else {
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// 主处理函数
module.exports = async (req, res) => {
    const taskId = req.body.taskId;
    if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
    }

    try {
        // 处理文件上传
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) reject(new CompressionError('Upload failed', 'UPLOAD_ERROR', err.message));
                else resolve();
            });
        });

        if (!req.file) {
            throw new CompressionError('No file uploaded', 'NO_FILE');
        }

        // 初始化任务状态
        setTaskStatus(taskId, 'processing', { progress: 0 });

        // 开始压缩
        const level = req.body.level || 'medium';
        const { buffer: compressedData, totalSaved } = await compressEpub(
            req.file.buffer,
            level,
            taskId
        );
        
        const compressedSize = compressedData.length;

        // 保存压缩后的文件
        const fileName = `${path.basename(req.file.originalname, '.epub')}-compressed.epub`;
        const outputPath = path.join(os.tmpdir(), fileName);
        await fs.promises.writeFile(outputPath, compressedData);

        // 设置任务完成状态
        const result = {
            originalSize: req.file.size,
            compressedSize,
            compressionRatio: ((1 - compressedSize / req.file.size) * 100).toFixed(2),
            spacesSaved: totalSaved,
            downloadUrl: `/api/download?file=${encodeURIComponent(fileName)}`
        };

        setTaskStatus(taskId, 'completed', { result });

        // 返回初始响应
        res.json({ taskId });

    } catch (error) {
        handleCompressionError(error, res);
    }
}; 