const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { createReadStream } = require('fs');

// Validate file name
function isValidFileName(fileName) {
    return /^[a-zA-Z0-9-_]+\.epub$/.test(fileName) && 
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

        if (!isValidFileName(fileName)) {
            return res.sendError({
                message: 'Invalid file name',
                code: 'INVALID_FILENAME'
            });
        }

        const filePath = path.join(os.tmpdir(), fileName);

        try {
            await fs.access(filePath);
        } catch (error) {
            return res.sendError({
                message: 'File not found',
                code: 'FILE_NOT_FOUND'
            });
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Stream the file
        const fileStream = createReadStream(filePath);
        
        fileStream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.sendError({
                    message: 'Failed to read file',
                    code: 'STREAM_ERROR'
                });
            }
            res.end();
        });

        // Clean up after download
        fileStream.on('end', async () => {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.error('Error deleting temporary file:', error);
            }
        });

        // Start streaming
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.sendError({
                message: 'Download failed',
                code: 'DOWNLOAD_ERROR'
            });
        }
        res.end();
    }
}; 