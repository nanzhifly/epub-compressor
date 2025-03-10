const express = require('express');
const path = require('path');
const multer = require('multer');
const compress = require('./api/compress');
const download = require('./api/download');
const status = require('./api/status');

// 创建 Express 应用
const app = express();

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 52428800, // 50MB
    files: 1
  }
}).single('file');

// 设置文件大小限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 设置静态文件服务
const staticPath = path.join(__dirname, 'src');
app.use(express.static(staticPath));

// API 路由
app.post('/api/compress', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          details: `Maximum file size is ${process.env.MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      return next(err);
    }
    compress(req, res, next);
  });
});

app.get('/api/download', download);
app.get('/api/status', status);

// 处理根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// 处理其他路由，返回 index.html（用于 SPA）
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 