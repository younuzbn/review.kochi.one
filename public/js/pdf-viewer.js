// PDF Viewer Component using react-pdf
class PDFViewer {
    constructor(containerId, pdfUrl) {
        this.containerId = containerId;
        this.pdfUrl = pdfUrl;
        this.scale = 2.0; // Locked at 200%
        this.isLoading = true;
        this.pdfDocument = null;
        
        this.init();
    }

    async init() {
        try {
            // Load PDF.js
            await this.loadPDFJS();
            
            // Create the viewer UI
            this.createViewerUI();
            
            // Load the PDF document
            await this.loadPDF();
            
        } catch (error) {
            console.error('Error initializing PDF viewer:', error);
            this.showError('Failed to load PDF viewer');
        }
    }

    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Configure PDF.js worker
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createViewerUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container with id "${this.containerId}" not found`);
        }

        container.innerHTML = `
            <div class="pdf-viewer-container">
                <div class="pdf-content">
                    <div id="pdf-canvas-container" class="pdf-canvas-container">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading PDF...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        // No event listeners needed for continuous scroll view
    }

    async loadPDF() {
        try {
            this.isLoading = true;
            this.showLoading(true);

            // Load PDF document
            this.pdfDocument = await window.pdfjsLib.getDocument(this.pdfUrl).promise;
            const totalPages = this.pdfDocument.numPages;
            
            // Render all pages
            await this.renderAllPages(totalPages);
            
            this.isLoading = false;
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF document');
        }
    }

    async renderAllPages(totalPages) {
        const container = document.getElementById('pdf-canvas-container');
        container.innerHTML = '';
        
        // Create a wrapper for all pages
        const pagesWrapper = document.createElement('div');
        pagesWrapper.className = 'pdf-pages-wrapper';
        
        // Render all pages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                const page = await this.pdfDocument.getPage(pageNum);
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                // Calculate scale
                const viewport = page.getViewport({ scale: this.scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                // Add page wrapper
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'pdf-page-wrapper';
                
                // Add page number label
                const pageLabel = document.createElement('div');
                pageLabel.className = 'pdf-page-label';
                pageLabel.textContent = `Page ${pageNum}`;
                
                // Render page
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Assemble page
                pageWrapper.appendChild(pageLabel);
                pageWrapper.appendChild(canvas);
                pagesWrapper.appendChild(pageWrapper);
                
            } catch (error) {
                console.error(`Error rendering page ${pageNum}:`, error);
            }
        }
        
        container.appendChild(pagesWrapper);
    }

    async renderPage(pageNumber) {
        // This method is kept for compatibility but not used in continuous scroll mode
        console.log('renderPage called but not used in continuous scroll mode');
    }



    showLoading(show) {
        const container = document.getElementById('pdf-canvas-container');
        if (show) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading PDF...</p>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('pdf-canvas-container');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize PDF viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the menu page and have a PDF URL
    const pdfUrl = window.menuPdfUrl;
    if (pdfUrl) {
        new PDFViewer('pdf-viewer-container', pdfUrl);
    }
});
