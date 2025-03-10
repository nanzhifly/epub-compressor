class FileUploader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.selectFileButton = document.getElementById('selectFile');
        this.compressionPanel = document.getElementById('compressionPanel');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = this.fileInfo.querySelector('.file-name');
        this.fileSize = this.fileInfo.querySelector('.file-size');
        
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
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
            this.showError('Please select an EPUB file');
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            this.showError('File size cannot exceed 50MB');
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

    showError(message) {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.textContent = message;
        statusMessage.classList.add('error');
        document.getElementById('progressSection').hidden = false;
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