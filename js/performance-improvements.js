// ==========================================
// PERFORMANCE-IMPROVEMENTS.JS — Optimisations de performance
// ==========================================

/**
 * Optimisations de cache, pagination, et lazy-loading
 */

class PerformanceOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.apiCache = new Map();
        this.apiCacheExpiry = 1000 * 60 * 30; // 30 minutes
        this.debounceTimers = new Map();
        this.requestPool = [];
        this.maxConcurrentRequests = 5;
        this.activeRequests = 0;
    }

    /**
     * Cache les images avec lazy loading
     */
    optimizeImageLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Débounce pour les recherches et filtres
     */
    debounce(key, fn, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        const timer = setTimeout(fn, delay);
        this.debounceTimers.set(key, timer);
    }

    /**
     * Cache des requêtes API avec expiration
     */
    cacheAPIResponse(key, data, expiryMs = this.apiCacheExpiry) {
        this.apiCache.set(key, {
            data,
            timestamp: Date.now(),
            expiry: expiryMs
        });
    }

    getAPICache(key) {
        const cached = this.apiCache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > cached.expiry) {
            this.apiCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Pool de requêtes pour limiter les requêtes concurrentes
     */
    async queueRequest(fn) {
        return new Promise((resolve, reject) => {
            this.requestPool.push({ fn, resolve, reject });
            this.processRequestPool();
        });
    }

    async processRequestPool() {
        while (this.activeRequests < this.maxConcurrentRequests && this.requestPool.length > 0) {
            this.activeRequests++;
            const { fn, resolve, reject } = this.requestPool.shift();

            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.activeRequests--;
                this.processRequestPool();
            }
        }
    }

    /**
     * Virtualisation pour listes très longues
     * Rend seulement les éléments visibles + buffer
     */
    virtualizeList(items, containerHeight, itemHeight, bufferSize = 5) {
        const scrollTop = 0; // À récupérer du container
        const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const visibleEnd = Math.min(
            items.length,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
        );

        return {
            items: items.slice(visibleStart, visibleEnd),
            startIndex: visibleStart,
            endIndex: visibleEnd,
            totalHeight: items.length * itemHeight,
            offsetY: visibleStart * itemHeight
        };
    }

    /**
     * Comprime les données avant localStorage
     */
    compressData(data) {
        const json = JSON.stringify(data);
        // Utiliser une compression simple (base64)
        return btoa(json);
    }

    decompressData(compressed) {
        try {
            return JSON.parse(atob(compressed));
        } catch (e) {
            return null;
        }
    }

    /**
     * Limite la taille du localStorage
     */
    pruneLocalStorage(maxSizeKB = 5000) {
        const used = JSON.stringify(localStorage).length / 1024;
        
        if (used > maxSizeKB) {
            // Supprimer les données les plus anciennes
            const cachesToRemove = [
                'media_pool_cache',
                'search_results_cache',
                'old_library_backups'
            ];

            cachesToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    /**
     * Batch les mises à jour de DOM
     */
    batchDOMUpdates(updates) {
        // Utiliser requestAnimationFrame pour grouper les mises à jour
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                resolve();
            });
        });
    }

    /**
     * Précharge les ressources critiques
     */
    preloadCriticalResources() {
        // Précharger les fonts et CSS critiques
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
        document.head.appendChild(link);

        // Précharger les images les plus fréquentes
        const preloadImages = [
            'https://placehold.co/155x217/1f2937/4b5563'
        ];

        preloadImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    /**
     * Web Worker pour calculs lourds
     */
    async offloadToWorker(data, operation) {
        if (!window.performanceWorker) {
            console.warn('Web Worker not available');
            return null;
        }

        return new Promise((resolve) => {
            const handler = (event) => {
                resolve(event.data);
                window.performanceWorker.removeEventListener('message', handler);
            };
            window.performanceWorker.addEventListener('message', handler);
            window.performanceWorker.postMessage({ data, operation });
        });
    }

    /**
     * Mesure les performances
     */
    measurePerformance(label, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    /**
     * Rapport de performances
     */
    getPerformanceReport() {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
            dns: perfData.domainLookupEnd - perfData.domainLookupStart,
            tcp: perfData.connectEnd - perfData.connectStart,
            ttfb: perfData.responseStart - perfData.requestStart,
            download: perfData.responseEnd - perfData.responseStart,
            domParsing: perfData.domInteractive - perfData.domLoading,
            resources: performance.getEntriesByType('resource').length,
            totalTime: perfData.loadEventEnd - perfData.loadEventStart
        };
    }
}

// Instance globale
const perfOptimizer = new PerformanceOptimizer();

// ==========================================
// INITIALIZATION
// ==========================================

// Lancer les optimisations au chargement
document.addEventListener('DOMContentLoaded', () => {
    perfOptimizer.preloadCriticalResources();
    perfOptimizer.optimizeImageLoading();
});

// Nettoyer localStorage périodiquement
setInterval(() => {
    perfOptimizer.pruneLocalStorage();
}, 1000 * 60 * 60); // Toutes les heures
