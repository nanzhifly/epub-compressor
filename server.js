const express = require('express');
const path = require('path');
const compress = require('./api/compress');
const download = require('./api/download');

const app = express();

// 允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 设置静态文件服务
app.use(express.static(path.join(__dirname, 'src')));

// API 路由
app.post('/api/compress', compress);
app.get('/api/download', download);

// 处理根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// 处理其他所有路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// 处理 Vercel 的健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 导出 app 实例供 Vercel 使用
module.exports = app; 