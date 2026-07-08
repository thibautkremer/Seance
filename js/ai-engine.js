// ==========================================
// AI-ENGINE.JS — Recommandations basées sur l'IA
// ==========================================

/**
 * Algorithme d'IA pour générer des recommandations intelligentes
 * Utilise content-based filtering + collaborative filtering basique
 */

class AIRecommendationEngine {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 1000 * 60 * 60; // 1 heure
    }

    /**
     * Génère des recommandations basées sur la préférence de l'utilisateur
     */
    async generateRecommendations(options = {}) {
        const {
            limit = 50,
            excludeWatched = true,
            forceRefresh = false
        } = options;

        const cacheKey = `recommendations_${limit}_${excludeWatched}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry && !forceRefresh) {
            return cached.data;
        }

        let recommendations = [];

        // 1. Extraire les préférences de l'utilisateur
        const userProfile = this.buildUserProfile();
        
        // 2. Récupérer tous les médias disponibles
        const allMedia = await this.getAllMediaPool();
        
        // 3. Filtrer les médias déjà regardés
        let candidates = allMedia;
        if (excludeWatched) {
            const watchedIds = new Set(library.map(l => l.id));
            candidates = candidates.filter(m => !watchedIds.has(m.id));
        }

        // 4. Score chaque candidat
        const scored = candidates.map(media => ({
            media,
            score: this.calculateMediaScore(media, userProfile)
        }));

        // 5. Trier et retourner les top N
        recommendations = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.media);

        // Mettre en cache
        this.cache.set(cacheKey, {
            data: recommendations,
            timestamp: Date.now()
        });

        return recommendations;
    }

    /**
     * Recommandations basées sur un média spécifique
     * "Parce que tu as regardé X, tu pourrais aimer Y"
     */
    async generateSimilarTo(mediaId, limit = 20) {
        const cacheKey = `similar_${mediaId}_${limit}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        const media = globalMediaCache.get(mediaId) || library.find(l => l.id === mediaId);
        if (!media) return [];

        const allMedia = await this.getAllMediaPool();
        const watchedIds = new Set(library.map(l => l.id));
        
        const candidates = allMedia.filter(m => 
            !watchedIds.has(m.id) && m.id !== mediaId
        );

        const scored = candidates.map(candidate => ({
            media: candidate,
            score: this.calculateSimilarity(media, candidate)
        }));

        const results = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.media);

        this.cache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        return results;
    }

    /**
     * Crée un profil utilisateur basé sur son historique
     */
    buildUserProfile() {
        const genreScores = {};
        const ratingPreference = { min: 0, avg: 0, count: 0 };
        const typePreferences = { series: 0, movie: 0 };

        library.forEach(item => {
            // Genre preferences
            (item.genres || []).forEach(genre => {
                genreScores[genre] = (genreScores[genre] || 0) + 1;
            });

            // Rating preference
            if (item.user_rating) {
                ratingPreference.avg += item.user_rating;
                ratingPreference.count += 1;
            }

            // Type preference
            typePreferences[item.type] = (typePreferences[item.type] || 0) + 1;
        });

        ratingPreference.avg = ratingPreference.count > 0 ? ratingPreference.avg / ratingPreference.count : 5;

        return {
            genres: genreScores,
            ratingPreference: ratingPreference.avg,
            typePreferences,
            librarySize: library.length
        };
    }

    /**
     * Calcule un score de pertinence pour un média
     */
    calculateMediaScore(media, userProfile) {
        let score = 0;

        // 1. Score de popularité/rating (30%)
        const ratingScore = (media.rating || 0) / 10;
        score += ratingScore * 30;

        // 2. Score de genre (40%)
        let genreMatchScore = 0;
        const userGenres = userProfile.genres;
        const mediaGenres = media.genres || [];

        if (Object.keys(userGenres).length > 0 && mediaGenres.length > 0) {
            const matchedGenres = mediaGenres.filter(g => userGenres[g]);
            genreMatchScore = matchedGenres.length / Math.max(mediaGenres.length, 1);
        }
        score += genreMatchScore * 40;

        // 3. Score de type (20%)
        const userTypePrefs = userProfile.typePreferences;
        const mediaType = media.type;
        const totalTypePrefs = userTypePrefs.series + userTypePrefs.movie;
        const typePreference = totalTypePrefs > 0 ? userTypePrefs[mediaType] / totalTypePrefs : 0.5;
        score += typePreference * 20;

        // 4. Bonus de diversité (10%)
        // Encourager la découverte de genres moins vus
        const genrePopularity = Math.min((userGenres[mediaGenres[0]] || 1) / Math.max(...Object.values(userGenres), 1), 1);
        const diversityBonus = (1 - genrePopularity) * 10;
        score += diversityBonus;

        // 5. Malus si années trop vieilles (sauf si l'utilisateur aime les classiques)
        const currentYear = new Date().getFullYear();
        const mediaYear = parseInt(media.premiered) || currentYear;
        const yearDiff = currentYear - mediaYear;
        
        if (yearDiff > 30 && genreMatchScore < 0.5) {
            score -= 5;
        }

        return Math.max(0, score);
    }

    /**
     * Calcule la similarité entre deux médias
     */
    calculateSimilarity(media1, media2) {
        let similarity = 0;

        // Genre similarity (50%)
        const genres1 = new Set(media1.genres || []);
        const genres2 = new Set(media2.genres || []);
        const intersection = [...genres1].filter(g => genres2.has(g)).length;
        const union = new Set([...genres1, ...genres2]).size;
        const jaccardSimilarity = union > 0 ? intersection / union : 0;
        similarity += jaccardSimilarity * 50;

        // Type match (20%)
        if (media1.type === media2.type) {
            similarity += 20;
        }

        // Rating proximity (15%)
        const ratingDiff = Math.abs((media1.rating || 0) - (media2.rating || 0));
        const ratingScore = Math.max(0, 1 - (ratingDiff / 10));
        similarity += ratingScore * 15;

        // Network/Studio (15%)
        if (media1.network === media2.network && media1.network) {
            similarity += 15;
        }

        return similarity;
    }

    /**
     * Récupère le pool de tous les médias disponibles
     */
    async getAllMediaPool() {
        const cached = this.cache.get('media_pool');
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        let allMedia = [];

        // Ajouter les médias du cache global
        allMedia.push(...globalMediaCache.values());

        // Ajouter les médias populaires de TVMaze
        try {
            await ensureShowsPool();
            allMedia.push(...showsCache.slice(0, 100).map(normalizeShow));
        } catch (e) {
            console.warn("Impossible de charger le pool TVMaze");
        }

        // Dédupliquer
        const seen = new Set();
        const deduped = allMedia.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });

        this.cache.set('media_pool', {
            data: deduped,
            timestamp: Date.now()
        });

        return deduped;
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Instance globale
const aiEngine = new AIRecommendationEngine();
