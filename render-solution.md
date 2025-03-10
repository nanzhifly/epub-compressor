# EPUB Compressor - Render 平台解决方案

## 平台迁移说明
从 Vercel 迁移到 Render 平台的主要原因是需要一个完整的 Node.js 服务器环境，而不是 Serverless 函数架构。

## Render 平台特性
1. **完整服务器环境**
   - 持续运行的 Node.js 服务
   - 支持完整的 Express.js 功能
   - 服务器状态可持续维护

2. **文件系统支持**
   - 可使用临时文件存储
   - 支持文件读写操作
   - 临时文件自动清理机制

3. **内存状态管理**
   - 服务器内存可持续使用
   - 支持 Map 对象存储任务状态
   - 不会像 Serverless 环境频繁重启

## 架构设计

### 1. 服务器配置
```yaml
# render.yaml
services:
  - type: web
    name: epub-compressor
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
```

### 2. 状态管理
```javascript
// 使用 Map 存储任务状态
const tasks = new Map();

// 定期清理机制
setInterval(() => {
    const now = Date.now();
    for (const [taskId, task] of tasks.entries()) {
        if (now - task.timestamp > 5 * 60 * 1000) {
            tasks.delete(taskId);
        }
    }
}, 60 * 1000);
```

### 3. 文件处理流程
1. 接收上传文件
2. 存储到临时目录
3. 进行压缩处理
4. 返回下载链接
5. 自动清理临时文件

### 4. API 响应格式
```javascript
{
    status: 'success' | 'error',
    data: {
        taskId: string,
        progress?: number,
        downloadUrl?: string
    },
    error?: string
}
```

## 注意事项

### 1. 环境变量
- MAX_FILE_SIZE: 最大文件大小限制
- NODE_ENV: 运行环境
- PORT: 服务器端口

### 2. 错误处理
- 统一的错误响应格式
- 详细的错误日志记录
- 客户端友好的错误提示

### 3. 性能优化
- 限制并发处理任务数
- 定期清理临时文件
- 内存使用监控

### 4. 安全考虑
- 文件类型验证
- 文件大小限制
- 防止恶意文件上传

## 维护建议

1. **日常维护**
   - 监控服务器状态
   - 检查日志记录
   - 清理过期文件

2. **性能监控**
   - 观察内存使用情况
   - 监控并发任务数
   - 检查响应时间

3. **错误处理**
   - 记录错误日志
   - 分析错误模式
   - 及时修复问题

## 部署流程

1. **准备工作**
   - 确保 package.json 配置正确
   - 检查所有依赖项
   - 准备环境变量

2. **部署步骤**
   - 推送代码到 GitHub
   - 在 Render 控制台创建新服务
   - 选择 GitHub 仓库
   - 配置环境变量
   - 启动服务

3. **验证部署**
   - 检查服务状态
   - 测试文件上传
   - 验证压缩功能
   - 确认下载功能 