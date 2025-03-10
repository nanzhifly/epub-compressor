# EPUB电子书压缩工具技术栈

## 前端技术

### 核心技术
- HTML5：构建基础页面结构
- CSS3：页面样式和响应式设计
- Vanilla JavaScript：实现交互逻辑，不引入额外框架
- 界面语言：英文（en-US）

### 主要功能模块
1. 文件上传
   - 使用 HTML5 File API
   - 支持拖拽上传
   - 文件类型验证（.epub）

2. 压缩选项
   - 自定义 select 下拉菜单
   - 支持三级压缩选项（low/medium/high）

3. 进度显示
   - 使用 HTML5 Progress 元素
   - 实时进度更新
   - 状态提示信息（英文）

4. 下载功能
   - Blob 对象处理
   - 创建临时下载链接

## 后端技术

### 服务器环境
- Vercel Serverless Functions：提供后端服务
- Node.js 运行环境

### 核心依赖
- multer：处理文件上传
- adm-zip：EPUB文件解压缩处理

### API 设计
- RESTful API
- 端点：/api/compress
- 支持文件上传和下载

## 开发工具

### 版本控制
- Git：代码版本管理
- GitHub：代码托管

### 部署平台
- Vercel：自动化部署
- 支持持续集成/持续部署（CI/CD）

## 浏览器支持
- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 开发环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0 