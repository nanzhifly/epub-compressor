class Compressor {
    constructor() {
        this.compressButton = document.getElementById('compressButton');
        this.fileInput = document.getElementById('fileInput');
        this.compressionLevel = document.getElementById('compressionLevel');
        this.progressSection = document.getElementById('progressSection');
        this.downloadSection = document.getElementById('downloadSection');
        this.downloadLink = document.getElementById('downloadLink');
        this.compressNewFile = document.getElementById('compressNewFile');
        this.compressionResults = document.getElementById('compressionResults');
        this.pollInterval = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.compressButton.addEventListener('click', () => this.startCompression());
        this.compressNewFile.addEventListener('click', () => this.resetUI());
    }

    async startCompression() {
        const file = this.fileInput.files[0];
        if (!file) {
            window.progress.updateStatus('Please select a file', true);
            return;
        }

        // Validate file type and size
        if (!file.name.toLowerCase().endsWith('.epub')) {
            window.progress.updateStatus('Only EPUB files are allowed', true);
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            window.progress.updateStatus('File size must be less than 50MB', true);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('level', this.compressionLevel.value);
        formData.append('taskId', Date.now().toString());

        this.updateUIBeforeCompression();

        try {
            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData
            });

            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.error?.message || 'Compression failed';
                throw new Error(errorMessage);
            }

            if (responseData.status !== 'success' || !responseData.data?.taskId) {
                throw new Error('Invalid server response');
            }

            // Start polling for progress
            this.startPolling(responseData.data.taskId);

        } catch (error) {
            console.error('Compression error:', error);
            window.progress.updateStatus(
                `Error: ${error.message}`,
                true
            );
            this.stopPolling();
            this.compressButton.disabled = false;
        }
    }

    startPolling(taskId) {
        // Poll progress every second
        this.pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/status?taskId=${taskId}`);
                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error?.message || 'Failed to fetch status';
                    throw new Error(errorMessage);
                }

                if (responseData.status !== 'success') {
                    throw new Error(responseData.error?.message || 'Unknown error');
                }

                const data = responseData.data;

                switch (data.status) {
                    case 'processing':
                        window.progress.updateProgress(data.progress || 0);
                        window.progress.updateStatus('Processing...');
                        break;
                    case 'completed':
                        if (data.result) {
                            this.showCompressionResult(data.result);
                            this.stopPolling();
                        }
                        break;
                    case 'error':
                        throw new Error(data.error?.message || 'Compression failed');
                    default:
                        throw new Error('Unknown status');
                }
            } catch (error) {
                console.error('Status check error:', error);
                window.progress.updateStatus(error.message, true);
                this.stopPolling();
                this.compressButton.disabled = false;
            }
        }, 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    updateUIBeforeCompression() {
        this.compressButton.disabled = true;
        this.progressSection.hidden = false;
        this.downloadSection.hidden = true;
        window.progress.updateProgress(0);
        window.progress.updateStatus('Starting compression...');
    }

    showCompressionResult(result) {
        const originalSize = this.formatFileSize(result.originalSize);
        const compressedSize = this.formatFileSize(result.compressedSize);
        const compressionRatio = result.compressionRatio;

        this.downloadLink.href = result.downloadUrl;
        this.downloadSection.hidden = false;
        
        this.compressionResults.textContent = 
            `Original size: ${originalSize} → Compressed: ${compressedSize} (${compressionRatio}% smaller)`;

        window.progress.updateProgress(100);
        window.progress.updateStatus('Compression complete!');
        this.compressButton.disabled = false;
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    resetUI() {
        this.fileInput.value = '';
        document.getElementById('compressionPanel').hidden = true;
        this.progressSection.hidden = true;
        this.downloadSection.hidden = true;
        window.progress.reset();
        this.stopPolling();
    }
}

// Initialize compressor
window.compressor = new Compressor(); 