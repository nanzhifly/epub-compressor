const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { createReadStream } = require('fs');

// Validate file name
function isValidFileName(fileName) {
    return fileName.toLowerCase().endsWith('.epub') && 
           !fileName.includes('..') && 
           !fileName.includes('/');
}

// Download handler
module.exports = async (req, res) => {
    try {
        const fileName = req.query.file;

        if (!fileName) {
            return res.sendError({
                message: 'File name is required',
                code: 'MISSING_FILENAME'
            });
        }

        if (!fileName.toLowerCase().endsWith('.epub')) {
            return res.sendError({
                message: 'Invalid file name',
                code: 'INVALID_FILENAME'
            });
        }

        // 从内存中获取压缩后的文件
        const compressedFile = req.app.locals.compressedFiles?.get(fileName);
        
        if (!compressedFile) {
            return res.sendError({
                message: 'File not found or expired',
                code: 'FILE_NOT_FOUND'
            });
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', compressedFile.length);

        // Send the file
        res.send(compressedFile);

        // Remove the file from memory after a delay
        setTimeout(() => {
            req.app.locals.compressedFiles?.delete(fileName);
        }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.sendError({
                message: 'Download failed',
                code: 'DOWNLOAD_ERROR'
            });
        }
    }
}; 