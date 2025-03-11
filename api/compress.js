const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const sharp = require('sharp');
const { setTaskStatus } = require('./status');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');

// Compression configuration
const optimizedCompressionConfig = {
    text: {
        low: { 
            level: 6, 
            method: 'DEFLATE',
            removeComments: false,
            preserveWhitespace: true
        },
        medium: { 
            level: 8, 
            method: 'DEFLATE',
            removeComments: true,
            preserveWhitespace: false
        },
        high: { 
            level: 9, 
            method: 'DEFLATE',
            removeComments: true,
            preserveWhitespace: false,
            minifyContent: true
        }
    },
    images: {
        low: { 
            quality: 90,
            method: 'DEFLATE',
            resize: false,
            format: 'preserve',
            optimizeMetadata: true
        },
        medium: { 
            quality: 80,
            method: 'DEFLATE',
            resize: true,
            maxWidth: 1800,
            maxHeight: 1800,
            format: 'auto',
            optimizeMetadata: true
        },
        high: { 
            quality: 70,
            method: 'DEFLATE',
            resize: true,
            maxWidth: 1500,
            maxHeight: 1500,
            format: 'auto',
            optimizeMetadata: true,
            convertToWebP: true
        }
    },
    fonts: {
        low: { 
            level: 5, 
            method: 'DEFLATE',
            subset: false
        },
        medium: { 
            level: 7, 
            method: 'DEFLATE',
            subset: 'used-only'
        },
        high: { 
            level: 9, 
            method: 'DEFLATE',
            subset: 'used-only',
            convertToWoff2: true
        }
    },
    others: {
        low: { level: 3, method: 'DEFLATE' },
        medium: { level: 5, method: 'DEFLATE' },
        high: { level: 7, method: 'DEFLATE' }
    }
};

// Error messages
const ERROR_MESSAGES = {
    FILE_TOO_LARGE: {
        message: '文件大小超过 4MB 限制',
        suggestion: '请尝试手动分割文件或使用其他工具预压缩'
    },
    INVALID_FORMAT: {
        message: '不支持的文件格式',
        suggestion: '仅支持 EPUB 格式的电子书文件'
    },
    FILE_CORRUPTED: {
        message: 'EPUB 文件已损坏',
        suggestion: '请检查文件完整性或重新导出 EPUB'
    },
    COMPRESSION_FAILED: {
        message: '压缩过程中出现错误',
        suggestion: '请重试，如果问题持续存在请联系支持'
    },
    NO_FILE: {
        message: '未选择文件',
        suggestion: '请选择一个 EPUB 文件进行压缩'
    }
};

// File validation
async function validateEpubFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        const errors = [];

        // Check file size
        if (stats.size > 4 * 1024 * 1024) {
            errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
        }

        // Check file format
        const buffer = await fs.readFile(filePath, { start: 0, end: 99 });
        const isEpub = buffer.includes('mimetypeapplication/epub+zip');
        if (!isEpub) {
            errors.push(ERROR_MESSAGES.INVALID_FORMAT);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    } catch (error) {
        console.error('File validation error:', error);
        return {
            isValid: false,
            errors: [ERROR_MESSAGES.FILE_CORRUPTED]
        };
    }
}

// File type detection
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.html', '.xhtml', '.htm', '.css', '.xml', '.opf', '.ncx', '.txt', '.js'].includes(ext)) {
        return 'text';
    }
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
        return 'images';
    }
    if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        return 'fonts';
    }
    return 'others';
}

// Image optimization
async function optimizeImage(buffer, config) {
    try {
        let sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();
        
        // 优化元数据
        if (config.optimizeMetadata) {
            sharpInstance = sharpInstance.withMetadata({
                orientation: metadata.orientation || 1,
                density: metadata.density
            });
        }

        // 调整大小
        if (config.resize && 
            (metadata.width > config.maxWidth || metadata.height > config.maxHeight)) {
            sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // 格式转换和压缩
        if (config.convertToWebP && metadata.format !== 'webp') {
            return await sharpInstance
                .webp({ 
                    quality: config.quality,
                    effort: 6,
                    lossless: false
                })
                .toBuffer();
        }

        // 根据原始格式优化
        switch (metadata.format) {
            case 'jpeg':
                return await sharpInstance
                    .jpeg({ 
                        quality: config.quality,
                        progressive: true,
                        optimizeCoding: true
                    })
                    .toBuffer();
            case 'png':
                return await sharpInstance
                    .png({ 
                        quality: config.quality,
                        compressionLevel: 9,
                        palette: true,
                        colors: 256
                    })
                    .toBuffer();
            case 'webp':
                return await sharpInstance
                    .webp({ 
                        quality: config.quality,
                        effort: 6
                    })
                    .toBuffer();
            default:
                return buffer;
        }
    } catch (error) {
        console.error('Image optimization error:', error);
        return buffer;
    }
}

// EPUB compression
async function compressEpub(fileBuffer, originalname, level, taskId) {
    try {
        // 验证文件
        const validation = await validateEpubBuffer(fileBuffer);
        if (!validation.isValid) {
            throw new Error(validation.errors[0].message);
        }

        const zip = new AdmZip(fileBuffer);
        const tempDir = path.join('/tmp', `epub-${taskId}`);
        await fs.mkdir(tempDir, { recursive: true });

        // 解压文件
        zip.extractAllTo(tempDir, true);

        const entries = zip.getEntries();
        const totalEntries = entries.length;
        let processedEntries = 0;
        let totalSaved = 0;

        // 处理每个文件
        for (const entry of entries) {
            if (entry.isDirectory) {
                processedEntries++;
                continue;
            }

            const entryPath = path.join(tempDir, entry.entryName);
            const fileType = getFileType(entry.entryName);
            const config = optimizedCompressionConfig[fileType][level];

            let buffer = await fs.readFile(entryPath);
            const originalSize = buffer.length;

            // 根据文件类型进行优化
            if (fileType === 'images') {
                buffer = await optimizeImage(buffer, config);
            } else if (fileType === 'text' && config.minifyContent) {
                // 文本内容优化
                const content = buffer.toString('utf8');
                if (entry.entryName.endsWith('.html') || entry.entryName.endsWith('.xhtml')) {
                    buffer = Buffer.from(content
                        .replace(/<!--[\s\S]*?-->/g, config.removeComments ? '' : '$&')
                        .replace(/\s+/g, config.preserveWhitespace ? '$&' : ' ')
                        .replace(/>\s+</g, '><'));
                } else if (entry.entryName.endsWith('.css')) {
                    buffer = Buffer.from(content
                        .replace(/\/\*[\s\S]*?\*\//g, config.removeComments ? '' : '$&')
                        .replace(/\s+/g, config.preserveWhitespace ? '$&' : ' '));
                }
            }

            await fs.writeFile(entryPath, buffer);
            zip.addFile(entry.entryName, buffer, '', {
                compression: config.method === 'DEFLATE' ? 8 : 0,
                compressionLevel: config.level || 0
            });

            const newSize = buffer.length;
            totalSaved += Math.max(0, originalSize - newSize);

            processedEntries++;
            await setTaskStatus(taskId, 'processing', {
                progress: Math.round((processedEntries / totalEntries) * 100),
                currentFile: path.basename(entry.entryName)
            });
        }

        // 清理临时目录
        await fs.rm(tempDir, { recursive: true, force: true });

        return {
            buffer: zip.toBuffer(),
            totalSaved,
            compressionRatio: totalSaved > 0 ? Math.round((totalSaved / zip.toBuffer().length) * 100) : 0
        };
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error(ERROR_MESSAGES.COMPRESSION_FAILED.message);
    }
}

// File validation
async function validateEpubBuffer(buffer) {
    try {
        const errors = [];

        // Check file size
        if (buffer.length > 4 * 1024 * 1024) {
            errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
        }

        // Check file format
        const isEpub = buffer.slice(0, 100).includes('mimetypeapplication/epub+zip');
        if (!isEpub) {
            errors.push(ERROR_MESSAGES.INVALID_FORMAT);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    } catch (error) {
        console.error('File validation error:', error);
        return {
            isValid: false,
            errors: [ERROR_MESSAGES.FILE_CORRUPTED]
        };
    }
}

// Main handler
module.exports = async (req, res) => {
    const { fileBuffer, originalname } = req.body;
    let outputBuffer = null;

    try {
        const taskId = req.body.taskId;
        
        if (!taskId) {
            return res.sendError({
                message: ERROR_MESSAGES.NO_FILE.message,
                suggestion: ERROR_MESSAGES.NO_FILE.suggestion,
                code: 'MISSING_TASK_ID'
            });
        }

        if (!fileBuffer) {
            return res.sendError({
                message: ERROR_MESSAGES.NO_FILE.message,
                suggestion: ERROR_MESSAGES.NO_FILE.suggestion,
                code: 'NO_FILE'
            });
        }

        // 初始化任务
        await setTaskStatus(taskId, 'processing', { progress: 0 });

        // 开始压缩
        const level = req.body.level || 'medium';
        if (!['low', 'medium', 'high'].includes(level)) {
            return res.sendError({
                message: '无效的压缩级别',
                suggestion: '请选择 low、medium 或 high 压缩级别',
                code: 'INVALID_LEVEL'
            });
        }

        const { buffer: compressedData, totalSaved, compressionRatio } = await compressEpub(
            fileBuffer,
            originalname,
            level,
            taskId
        );

        if (!compressedData || compressedData.length === 0) {
            throw new Error(ERROR_MESSAGES.COMPRESSION_FAILED.message);
        }

        // 保存压缩后的文件
        const fileName = `${path.basename(originalname, '.epub')}-compressed.epub`;
        outputBuffer = compressedData;

        // 更新任务状态
        const result = {
            originalSize: fileBuffer.length,
            compressedSize: compressedData.length,
            compressionRatio: compressionRatio,
            spacesSaved: totalSaved,
            downloadUrl: `/api/download?file=${encodeURIComponent(fileName)}`
        };

        await setTaskStatus(taskId, 'completed', { result });

        // 发送响应
        return res.sendSuccess({
            taskId,
            message: '压缩完成'
        });

    } catch (error) {
        console.error('Compression error:', error);
        
        if (req.body.taskId) {
            await setTaskStatus(req.body.taskId, 'error', {
                error: {
                    message: error.message,
                    suggestion: ERROR_MESSAGES[error.code]?.suggestion || ERROR_MESSAGES.COMPRESSION_FAILED.suggestion,
                    code: error.code || 'COMPRESSION_ERROR'
                }
            });
        }

        return res.sendError({
            message: error.message,
            suggestion: ERROR_MESSAGES[error.code]?.suggestion || ERROR_MESSAGES.COMPRESSION_FAILED.suggestion,
            code: error.code || 'COMPRESSION_ERROR'
        });
    }
}; 