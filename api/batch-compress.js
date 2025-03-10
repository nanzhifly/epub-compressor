const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 10, // 最多10个文件
        fileSize: 50 * 1024 * 1024, // 50MB limit per file
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/epub+zip' || 
            path.extname(file.originalname).toLowerCase() === '.epub') {
            cb(null, true);
        } else {
            cb(new Error('Only EPUB files are allowed'));
        }
    }
}).array('files', 10);

// 创建压缩工作线程
function createCompressionWorker(file, level) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`
            const { parentPort } = require('worker_threads');
            const AdmZip = require('adm-zip');

            parentPort.on('message', async ({ buffer, level }) => {
                try {
                    const zip = new AdmZip(buffer);
                    const entries = zip.getEntries();

                    entries.forEach((entry) => {
                        if (!entry.isDirectory) {
                            const entryData = entry.getData();
                            zip.updateFile(entry.entryName, entryData, '', { level });
                        }
                    });

                    const compressedBuffer = zip.toBuffer();
                    parentPort.postMessage({ success: true, data: compressedBuffer });
                } catch (error) {
                    parentPort.postMessage({ success: false, error: error.message });
                }
            });
        `);

        worker.on('message', (result) => {
            if (result.success) {
                resolve(result.data);
            } else {
                reject(new Error(result.error));
            }
        });

        worker.on('error', reject);
        worker.postMessage({ buffer: file.buffer, level });
    });
}

// 批量压缩处理
async function batchCompress(files, level) {
    const results = [];
    const workers = [];

    try {
        // 创建临时目录
        const batchDir = path.join(os.tmpdir(), `batch-${Date.now()}`);
        await fs.mkdir(batchDir);

        // 并行处理所有文件
        for (const file of files) {
            const worker = createCompressionWorker(file, level)
                .then(async (compressedData) => {
                    const fileName = `${path.basename(file.originalname, '.epub')}-compressed.epub`;
                    const outputPath = path.join(batchDir, fileName);
                    
                    await fs.writeFile(outputPath, compressedData);
                    
                    return {
                        originalName: file.originalname,
                        compressedName: fileName,
                        originalSize: file.size,
                        compressedSize: compressedData.length,
                        status: 'success'
                    };
                })
                .catch(error => ({
                    originalName: file.originalname,
                    status: 'error',
                    error: error.message
                }));

            workers.push(worker);
        }

        // 等待所有工作完成
        results.push(...await Promise.all(workers));

        return {
            batchId: path.basename(batchDir),
            results
        };
    } catch (error) {
        throw new Error(`Batch compression failed: ${error.message}`);
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 处理文件上传
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const compressionLevel = req.body.level || 'medium';
        const result = await batchCompress(req.files, compressionLevel);

        res.status(200).json({
            message: 'Batch compression completed',
            batchId: result.batchId,
            totalFiles: req.files.length,
            successCount: result.results.filter(r => r.status === 'success').length,
            errorCount: result.results.filter(r => r.status === 'error').length,
            results: result.results
        });
    } catch (error) {
        console.error('Batch compression error:', error);
        res.status(500).json({
            error: 'Batch compression failed',
            message: error.message
        });
    }
}; 