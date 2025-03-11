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
                title: '⚠️ File size exceeds limit',
                details: (size) => `Current file size: ${size}
Maximum allowed: 4MB

You can:
  • Pre-compress with other tools
  • Split into smaller files
  • Use local compression software`
            },
            INVALID_FORMAT: {
                title: '⚠️ Invalid file format',
                details: 'Please upload an EPUB format file'
            },
            UPLOAD_ERROR: {
                title: '⚠️ Upload failed',
                details: 'An error occurred during file upload, please try again'
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

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('taskId', Date.now().toString());

            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error.message || 'Upload failed');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            this.showError(
                this.ERROR_MESSAGES.UPLOAD_ERROR.title,
                error.message || this.ERROR_MESSAGES.UPLOAD_ERROR.details
            );
            throw error;
        }
    }

    processFile(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.epub')) {
            this.showError(
                this.ERROR_MESSAGES.INVALID_FORMAT.title,
                this.ERROR_MESSAGES.INVALID_FORMAT.details
            );
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            const sizeMB = this.formatFileSize(file.size);
            this.showError(
                this.ERROR_MESSAGES.FILE_TOO_LARGE.title,
                this.ERROR_MESSAGES.FILE_TOO_LARGE.details(sizeMB)
            );
            return;
        }

        // Start upload
        this.uploadFile(file).catch(error => {
            console.error('Upload error:', error);
        });
    }

    showError(title, details) {
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message error';
        statusMessage.innerHTML = `
            <div class="error-title">${title}</div>
            <pre class="error-details">${details}</pre>
        `;
        
        // Clear previous error message
        const oldMessage = document.querySelector('.status-message');
        if (oldMessage) {
            oldMessage.remove();
        }
        
        // Insert new error message
        const dropZone = document.getElementById('dropZone');
        dropZone.parentNode.insertBefore(statusMessage, dropZone.nextSibling);
        
        // Add shake animation
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

// Initialize file uploader
window.fileUploader = new FileUploader(); 