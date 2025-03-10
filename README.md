# EPUB Compressor

一个免费的在线 EPUB 电子书压缩工具，帮助用户在保持阅读体验的同时减小文件大小。

## 功能特点

- 🚀 快速压缩：高效的压缩算法
- 📱 响应式设计：支持各种设备访问
- 🔒 安全可靠：本地处理，保护隐私
- 💎 质量保证：智能压缩，保持质量

## 技术栈

- 前端：HTML5, CSS3, Vanilla JavaScript
- 后端：Node.js, Express
- 部署：Vercel Serverless Functions

## 主要功能

1. 文件上传
   - 支持拖拽上传
   - 文件大小限制：50MB
   - 仅支持 EPUB 格式

2. 压缩选项
   - 轻度压缩（最佳质量）
   - 标准压缩（推荐）
   - 最大压缩（最小体积）

3. 实时进度
   - 显示压缩进度
   - 文件大小对比
   - 压缩比率展示

## 本地开发

1. 克隆项目
```bash
git clone [repository-url]
cd epub-compressor
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 访问开发环境
```
http://localhost:3000
```

## 部署

项目使用 Vercel 进行部署，支持自动部署：

1. Fork 本项目
2. 在 Vercel 中导入项目
3. 自动部署完成

## 环境变量

- `MAX_FILE_SIZE`: 最大文件大小 (默认: 52428800 bytes / 50MB)
- `MAX_BATCH_FILES`: 批量处理最大文件数 (默认: 10)
- `COMPRESSION_CACHE_DURATION`: 缓存时间 (默认: 86400000 ms / 24h)
- `MAX_CONCURRENT_COMPRESSIONS`: 最大并发压缩数 (默认: 5)

## 开源协议

MIT License