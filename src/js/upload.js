class FileUploader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.selectFileButton = document.getElementById('selectFile');
        this.compressionPanel = document.getElementById('compressionPanel');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = this.fileInfo.querySelector('.file-name');
        this.fileSize = this.fileInfo.querySelector('.file-size');
        
        this.maxFileSize = 4 * 1024 * 1024; // 4MB
        
        // 更新文件大小显示
        const maxSizeDisplay = document.querySelector('.max-file-size');
        if (maxSizeDisplay) {
            maxSizeDisplay.textContent = 'Maximum file size: 4MB';
        }
        
        this.ERROR_MESSAGES = {
            FILE_TOO_LARGE: {
                title: '⚠️ 文件大小超出限制',
                details: (size) => `当前文件大小：${size}
最大允许大小：4MB

您可以：
  • 使用其他工具预压缩
  • 将文件分割成更小的部分
  • 使用本地压缩软件处理`
            },
            INVALID_FORMAT: {
                title: '⚠️ 不支持的文件格式',
                details: '仅支持 EPUB 格式的电子书文件'
            }
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Drag and drop events
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // Click to select file
        this.selectFileButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.epub')) {
            this.showError(
                this.ERROR_MESSAGES.INVALID_FORMAT.title,
                this.ERROR_MESSAGES.INVALID_FORMAT.details
            );
            return;
        }

        // 验证文件大小
        if (file.size > this.maxFileSize) {
            const sizeMB = this.formatFileSize(file.size);
            this.showError(
                this.ERROR_MESSAGES.FILE_TOO_LARGE.title,
                this.ERROR_MESSAGES.FILE_TOO_LARGE.details(sizeMB)
            );
            return;
        }

        // 显示文件信息
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        
        // 显示压缩面板
        this.compressionPanel.style.display = 'block';
        
        // 重置其他面板
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'none';
    }

    showError(title, details) {
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message error';
        statusMessage.innerHTML = `
            <div class="error-title">${title}</div>
            <pre class="error-details">${details}</pre>
        `;
        
        // 清除之前的错误消息
        const oldMessage = document.querySelector('.status-message');
        if (oldMessage) {
            oldMessage.remove();
        }
        
        // 插入新的错误消息
        const dropZone = document.getElementById('dropZone');
        dropZone.parentNode.insertBefore(statusMessage, dropZone.nextSibling);
        
        // 添加抖动动画
        statusMessage.classList.add('shake');
        setTimeout(() => statusMessage.classList.remove('shake'), 500);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化文件上传器
window.fileUploader = new FileUploader(); 