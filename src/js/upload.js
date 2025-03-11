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
        this.ERROR_MESSAGES = {
            FILE_TOO_LARGE: {
                title: '⚠️ File size exceeds limit',
                details: (size) => `Current file size: ${size}\nMaximum allowed: 4MB\n\nYou can:\n  • Pre-compress with other tools\n  • Split into smaller files\n  • Use local compression software`
            },
            INVALID_FORMAT: {
                title: '⚠️ Invalid file format',
                details: 'Please upload an EPUB format file'
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

        // Display file info
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        
        // Show compression panel
        this.compressionPanel.hidden = false;
        
        // Reset other panels
        document.getElementById('progressSection').hidden = true;
        document.getElementById('downloadSection').hidden = true;
    }

    showError(title, details) {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.innerHTML = `<div class="error-title">${title}</div><pre class="error-details">${details}</pre>`;
        statusMessage.classList.add('error');
        document.getElementById('progressSection').hidden = false;
        
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

// Initialize file uploader
window.fileUploader = new FileUploader(); 