class ProgressManager {
    constructor() {
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        this.statusMessage = document.getElementById('statusMessage');
        this.progressSection = document.getElementById('progressSection');
    }

    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
        this.progressPercent.textContent = `${percent}%`;
        this.progressSection.hidden = false;
    }

    updateStatus(message, isError = false) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'status-message ' + (isError ? 'error' : '');
        
        if (!isError) {
            this.progressText.textContent = message;
        }
        
        this.progressSection.hidden = false;
    }

    reset() {
        this.progressBar.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressText.textContent = 'Ready to start...';
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
        this.progressSection.hidden = true;
    }
}

// Initialize progress manager
window.progress = new ProgressManager(); 