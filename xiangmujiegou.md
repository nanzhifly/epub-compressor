# EPUB 电子书压缩工具项目结构

## 目录结构

epub-compressor/
├── public/
│   └── favicon.ico
├── src/
│   ├── styles/
│   │   └── main.css
│   ├── js/
│   │   ├── upload.js      # 处理文件上传逻辑
│   │   ├── compress.js    # 压缩相关操作
│   │   └── progress.js    # 进度条更新逻辑
│   └── index.html         # 主页面
├── api/
│   └── compress.js        # Vercel Serverless Function
├── package.json
├── vercel.json           # Vercel 配置文件
└── README.md            # 项目说明文档

## 文件说明

### 1. 前端文件

#### index.html
- 主页面，包含上传界面、压缩选项和进度显示
- 引用所有必要的 CSS 和 JavaScript 文件

#### styles/main.css
- 存放所有样式定义
- 包含响应式设计样式
- 遵循苹果设计风格

#### js/upload.js
- 处理文件选择和上传
- 验证文件类型和大小
- 显示文件信息

#### js/compress.js
- 与后端 API 交互
- 处理压缩请求
- 管理下载链接生成

#### js/progress.js
- 进度条更新逻辑
- 状态提示信息显示

### 2. 后端文件

#### api/compress.js
- Vercel Serverless Function
- 处理文件上传和压缩
- 返回压缩后的文件下载链接

### 3. 配置文件

#### package.json
- name: epub-compressor
- version: 1.0.0
- 主要依赖：adm-zip, multer

#### vercel.json
- 配置静态文件和API路由
- 设置构建规则
- 配置路由重写规则

## 开发注意事项

1. 文件命名规范
   - 使用小写字母
   - 用连字符（-）分隔单词
   - JavaScript 文件使用驼峰命名法

2. 代码规范
   - 使用 ES6+ 语法
   - 添加适当的注释
   - 遵循模块化开发原则

3. 安全考虑
   - 限制上传文件大小
   - 验证文件类型
   - 处理错误情况

4. 性能优化
   - 压缩静态资源
   - 使用异步加载
   - 实现适当的缓存策略

## 后续优化方向

1. 支持批量处理多个文件
2. 添加更多压缩等级选项
3. 优化压缩算法
4. 实现压缩历史记录
5. 添加进度详情显示 