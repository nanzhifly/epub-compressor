const express = require('express');
const path = require('path');
const multer = require('multer');
const compress = require('./api/compress');
const download = require('./api/download');
const status = require('./api/status');
const os = require('os');

// Initialize Express application
const app = express();

// Initialize compressed files storage
app.locals.compressedFiles = new Map();

// Task cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024, // 4MB
        files: 1
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

// Request size limits
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Response formatter middleware
app.use((req, res, next) => {
    res.sendSuccess = (data) => {
        res.json({
            status: 'success',
            data
        });
    };

    res.sendError = (error) => {
        const errorResponse = {
            status: 'error',
            error: {
                message: error.message || '未知错误',
                code: error.code || 'UNKNOWN_ERROR',
                suggestion: error.suggestion
            }
        };

        if (process.env.NODE_ENV === 'development' && error.stack) {
            errorResponse.error.stack = error.stack;
        }

        res.status(error.status || 400).json(errorResponse);
    };

    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// API Routes
app.post('/api/compress', (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.sendError({
                    message: 'File too large',
                    code: 'FILE_TOO_LARGE',
                    details: `Maximum file size is ${process.env.MAX_FILE_SIZE / (1024 * 1024)}MB`
                });
            }
            return res.sendError(err);
        }

        if (!req.file) {
            return res.sendError({
                message: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        if (!req.body.taskId) {
            return res.sendError({
                message: 'Task ID is required',
                code: 'MISSING_TASK_ID'
            });
        }

        try {
            req.body.fileBuffer = req.file.buffer;
            req.body.originalname = req.file.originalname;
            await compress(req, res);
        } catch (error) {
            next(error);
        }
    });
});

app.get('/api/download', (req, res) => {
    try {
        download(req, res);
    } catch (error) {
        console.error('Download error:', error);
        res.sendError(error);
    }
});

app.get('/api/status', status);

// Health check endpoint
app.get('/health', (req, res) => {
    res.sendSuccess({ status: 'ok' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Handle specific error types
    if (err.type === 'entity.too.large') {
        return res.sendError({
            message: 'Request entity too large',
            code: 'ENTITY_TOO_LARGE'
        }, 413);
    }
    
    res.sendError(err, err.status || 500);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));

// SPA route handling
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'src', 'index.html'));
    }
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('Received shutdown signal');
    server.close(async () => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close after 30s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app; 