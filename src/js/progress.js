class Progress {
    constructor() {
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        this.statusMessage = document.getElementById('statusMessage');
    }

    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
        this.progressPercent.textContent = `${Math.round(percent)}%`;
    }

    updateStatus(message, isError = false) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = isError ? 'status-message error' : 'status-message';
        
        if (!isError) {
            this.progressText.textContent = message;
        }
    }

    reset() {
        this.progressBar.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressText.textContent = 'Ready to compress';
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
    }
}

// Initialize progress
window.progress = new Progress(); 