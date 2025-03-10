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
        
        if (config.resize && 
            (metadata.width > config.maxWidth || metadata.height > config.maxHeight)) {
            sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

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
        }

        // Preserve original format
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
    } catch (error) {
        console.error('Image optimization error:', error);
        return buffer;
    }
}

// EPUB compression
async function compressEpub(inputPath, level, taskId) {
    try {
        const zip = new AdmZip();
        const tempDir = path.join(os.tmpdir(), `epub-${taskId}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Extract files
        const originalZip = new AdmZip(inputPath);
        originalZip.extractAllTo(tempDir, true);

        const entries = originalZip.getEntries();
        const totalEntries = entries.length;
        let processedEntries = 0;
        let totalSaved = 0;

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

            if (fileType === 'images') {
                buffer = await optimizeImage(buffer, config);
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
                progress: Math.round((processedEntries / totalEntries) * 100)
            });
        }

        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });

        return {
            buffer: zip.toBuffer(),
            totalSaved
        };
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress EPUB file');
    }
}

// Main handler
module.exports = async (req, res) => {
    const { filePath } = req.body;
    let outputPath = null;

    try {
        const taskId = req.body.taskId;
        
        if (!taskId) {
            return res.sendError({
                message: 'Task ID is required',
                code: 'MISSING_TASK_ID'
            });
        }

        if (!filePath) {
            return res.sendError({
                message: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        // Initialize task
        await setTaskStatus(taskId, 'processing', { progress: 0 });

        // Start compression
        const level = req.body.level || 'medium';
        if (!['low', 'medium', 'high'].includes(level)) {
            return res.sendError({
                message: 'Invalid compression level',
                code: 'INVALID_LEVEL'
            });
        }

        const stats = await fs.stat(filePath);
        const { buffer: compressedData, totalSaved } = await compressEpub(
            filePath,
            level,
            taskId
        );

        if (!compressedData || compressedData.length === 0) {
            throw new Error('Compression failed');
        }

        // Save compressed file
        const fileName = `${path.basename(filePath, '.epub')}-compressed.epub`;
        outputPath = path.join(os.tmpdir(), fileName);
        await fs.writeFile(outputPath, compressedData);

        // Clean up input file
        await fs.unlink(filePath);

        // Update task status
        const result = {
            originalSize: stats.size,
            compressedSize: compressedData.length,
            compressionRatio: ((1 - compressedData.length / stats.size) * 100).toFixed(2),
            spacesSaved: totalSaved,
            downloadUrl: `/api/download?file=${encodeURIComponent(fileName)}`
        };

        await setTaskStatus(taskId, 'completed', { result });

        // Send response
        return res.sendSuccess({
            taskId,
            message: 'Compression started successfully'
        });

    } catch (error) {
        console.error('Compression error:', error);
        
        // Clean up files
        try {
            if (filePath) {
                await fs.unlink(filePath);
            }
            if (outputPath) {
                await fs.unlink(outputPath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up files:', cleanupError);
        }
        
        if (req.body.taskId) {
            await setTaskStatus(req.body.taskId, 'error', {
                error: {
                    message: error.message,
                    code: error.code || 'COMPRESSION_ERROR'
                }
            });
        }

        return res.sendError(error);
    }
}; 