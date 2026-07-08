// ==========================================
// STREAMING-INFO.JS — Informations sur les services de streaming
// ==========================================

/**
 * Gère les informations de disponibilité sur les plateformes de streaming
 */

class StreamingInfoManager {
    constructor() {
        this.streamingData = new Map();
        this.providers = {
            'netflix': { name: 'Netflix', color: '#E50914', icon: '🎬' },
            'prime_video': { name: 'Prime Video', color: '#00A8E1', icon: '📺' },
            'disney_plus': { name: 'Disney+', color: '#113CCF', icon: '✨' },
            'hbo_max': { name: 'HBO Max', color: '#000000', icon: '🎭' },
            'apple_tv': { name: 'Apple TV+', color: '#555555', icon: '🍎' },
            'hulu': { name: 'Hulu', color: '#1CE783', icon: '📹' },
            'paramount_plus': { name: 'Paramount+', color: '#0064FF', icon: '🎪' },
            'peacock': { name: 'Peacock', color: '#FFD700', icon: '🦚' }
        };
    }

    /**
     * Récupère les informations de streaming (via JustWatch API ou similaire)
     */
    async fetchStreamingInfo(mediaId, mediaType) {
        const cacheKey = `streaming_${mediaId}`;
        const cached = perfOptimizer.getAPICache(cacheKey);
        
        if (cached) return cached;

        try {
            // Exemple avec JustWatch (nécessite une clé API)
            const response = await fetch(`https://api.justwatch.com/v3/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: mediaId,
                    content_types: mediaType === 'series' ? ['show'] : ['movie']
                })
            });

            const data = await response.json();
            const providers = data.offers?.map(offer => ({
                provider: offer.provider_id,
                type: offer.monetization_type, // 'flatrate', 'buy', 'rent'
                url: offer.url
            })) || [];

            perfOptimizer.cacheAPIResponse(cacheKey, providers);
            return providers;
        } catch (e) {
            console.warn('Erreur fetch streaming info:', e);
            return [];
        }
    }

    /**
     * Génère un badge pour le service de streaming
     */
    getStreamingBadge(provider) {
        const info = this.providers[provider];
        if (!info) return '';

        return `
            <div class="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold text-white" 
                style="background-color: ${info.color}">
                <span>${info.icon}</span>
                <span>${info.name}</span>
            </div>
        `;
    }

    /**
     * Retourne les URL de redirection vers les services
     */
    getStreamingLinks(media) {
        const links = [];

        // Netflix
        if (media.genres?.includes('Drama') || media.network === 'Netflix') {
            links.push({
                provider: 'netflix',
                url: `https://www.netflix.com/search?q=${encodeURIComponent(media.title)}`
            });
        }

        // Prime Video
        links.push({
            provider: 'prime_video',
            url: `https://www.primevideo.com/search?keyword=${encodeURIComponent(media.title)}`
        });

        // Disney+
        if (media.genres?.includes('Animation') || media.network?.includes('Disney')) {
            links.push({
                provider: 'disney_plus',
                url: `https://www.disneyplus.com/search?q=${encodeURIComponent(media.title)}`
            });
        }

        // HBO Max
        if (media.network?.includes('HBO')) {
            links.push({
                provider: 'hbo_max',
                url: `https://www.hbomax.com/search?q=${encodeURIComponent(media.title)}`
            });
        }

        return links;
    }

    /**
     * Affiche les options de visionnage disponibles
     */
    renderStreamingOptions(media) {
        const links = this.getStreamingLinks(media);
        
        if (links.length === 0) return '';

        let html = '<div class="mt-3 pt-3 border-t border-gray-700"><h4 class="text-xs font-bold text-teal-400 mb-2">📺 Regarder sur</h4><div class="flex flex-wrap gap-2">';

        links.forEach(link => {
            const info = this.providers[link.provider];
            html += `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" 
                   class="text-[9px] px-2 py-1 rounded text-white font-bold hover:opacity-80 transition"
                   style="background-color: ${info.color}">
                    ${info.icon} ${info.name}
                </a>
            `;
        });

        html += '</div></div>';
        return html;
    }
}

// Instance globale
const streamingManager = new StreamingInfoManager();
