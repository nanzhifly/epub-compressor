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
        this.ws = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.compressButton.addEventListener('click', () => this.startCompression());
        this.compressNewFile.addEventListener('click', () => this.resetUI());
    }

    setupWebSocket(taskId) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?taskId=${taskId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'progress') {
                window.progress.updateProgress(data.data.progress);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }

    async startCompression() {
        const file = this.fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('level', this.compressionLevel.value);

        this.updateUIBeforeCompression();

        try {
            // 生成任务ID
            const taskId = Date.now().toString();
            this.setupWebSocket(taskId);
            formData.append('taskId', taskId);

            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Compression failed');
            }

            const result = await response.json();
            this.showCompressionResult(result);
        } catch (error) {
            console.error('Error:', error);
            window.progress.updateStatus(
                `Error: ${error.message || 'Compression failed'}`, 
                true
            );
        } finally {
            this.compressButton.disabled = false;
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
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
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Initialize compressor
window.compressor = new Compressor(); 