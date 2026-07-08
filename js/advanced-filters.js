// ==========================================
// ADVANCED-FILTERS.JS — Filtrage avancé avec ordre personnalisé
// ==========================================

/**
 * Système de filtres avancés avec sauvegarde des préférences
 */

class AdvancedFilterEngine {
    constructor() {
        this.filters = this.loadFilters();
        this.sortOptions = {
            'added_desc': 'Plus récent d\'abord',
            'added_asc': 'Plus ancien d\'abord',
            'title_asc': 'Titre (A→Z)',
            'title_desc': 'Titre (Z→A)',
            'rating_desc': 'Meilleure note',
            'rating_asc': 'Pire note',
            'progress_desc': 'Plus avancé',
            'progress_asc': 'Moins avancé',
            'premiere_desc': 'Plus récent',
            'premiere_asc': 'Plus ancien'
        };
    }

    loadFilters() {
        const saved = localStorage.getItem('advanced_filters');
        return saved ? JSON.parse(saved) : {
            genres: [],
            yearMin: null,
            yearMax: null,
            ratingMin: 0,
            ratingMax: 10,
            runtime: null,
            status_production: 'all',
            sort: 'added_desc'
        };
    }

    saveFilters() {
        localStorage.setItem('advanced_filters', JSON.stringify(this.filters));
    }

    setGenres(genres) {
        this.filters.genres = genres;
        this.saveFilters();
    }

    setYearRange(min, max) {
        this.filters.yearMin = min;
        this.filters.yearMax = max;
        this.saveFilters();
    }

    setRatingRange(min, max) {
        this.filters.ratingMin = min;
        this.filters.ratingMax = max;
        this.saveFilters();
    }

    setRuntime(value) {
        this.filters.runtime = value; // 'short' (< 30min), 'medium' (30-90min), 'long' (> 90min)
        this.saveFilters();
    }

    setProductionStatus(status) {
        this.filters.status_production = status;
        this.saveFilters();
    }

    setSort(sortBy) {
        this.filters.sort = sortBy;
        this.saveFilters();
    }

    /**
     * Applique les filtres à une liste de médias
     */
    applyFilters(mediaList) {
        let filtered = [...mediaList];

        // Filtrer par genres
        if (this.filters.genres.length > 0) {
            filtered = filtered.filter(m => {
                const mediaGenres = m.genres || [];
                return this.filters.genres.some(g => mediaGenres.includes(g));
            });
        }

        // Filtrer par années
        if (this.filters.yearMin !== null) {
            filtered = filtered.filter(m => {
                const year = parseInt(m.premiered) || new Date().getFullYear();
                return year >= this.filters.yearMin;
            });
        }
        if (this.filters.yearMax !== null) {
            filtered = filtered.filter(m => {
                const year = parseInt(m.premiered) || new Date().getFullYear();
                return year <= this.filters.yearMax;
            });
        }

        // Filtrer par rating
        filtered = filtered.filter(m => {
            const rating = m.rating || 0;
            return rating >= this.filters.ratingMin && rating <= this.filters.ratingMax;
        });

        // Filtrer par durée
        if (this.filters.runtime) {
            filtered = filtered.filter(m => {
                const runtime = m.runtime || 0;
                if (this.filters.runtime === 'short') return runtime < 30;
                if (this.filters.runtime === 'medium') return runtime >= 30 && runtime <= 90;
                if (this.filters.runtime === 'long') return runtime > 90;
                return true;
            });
        }

        // Filtrer par statut production (pour séries)
        if (this.filters.status_production !== 'all') {
            filtered = filtered.filter(m => {
                if (m.type !== 'series') return true;
                const status = (m.status_production || '').toLowerCase();
                if (this.filters.status_production === 'running') return status.includes('running');
                if (this.filters.status_production === 'ended') return status.includes('ended');
                if (this.filters.status_production === 'canceled') return status.includes('cancel');
                return true;
            });
        }

        // Appliquer le tri
        this.applySorting(filtered);

        return filtered;
    }

    /**
     * Applique le tri personnalisé
     */
    applySorting(mediaList) {
        const sort = this.filters.sort;

        switch(sort) {
            case 'added_desc':
                mediaList.sort((a, b) => (b.date_added || 0) - (a.date_added || 0));
                break;
            case 'added_asc':
                mediaList.sort((a, b) => (a.date_added || 0) - (b.date_added || 0));
                break;
            case 'title_asc':
                mediaList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title_desc':
                mediaList.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            case 'rating_desc':
                mediaList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'rating_asc':
                mediaList.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                break;
            case 'progress_desc':
                mediaList.sort((a, b) => {
                    const progressA = this.getProgress(a);
                    const progressB = this.getProgress(b);
                    return progressB - progressA;
                });
                break;
            case 'progress_asc':
                mediaList.sort((a, b) => {
                    const progressA = this.getProgress(a);
                    const progressB = this.getProgress(b);
                    return progressA - progressB;
                });
                break;
            case 'premiere_desc':
                mediaList.sort((a, b) => {
                    const yearA = parseInt(a.premiered) || 0;
                    const yearB = parseInt(b.premiered) || 0;
                    return yearB - yearA;
                });
                break;
            case 'premiere_asc':
                mediaList.sort((a, b) => {
                    const yearA = parseInt(a.premiered) || 0;
                    const yearB = parseInt(b.premiered) || 0;
                    return yearA - yearB;
                });
                break;
        }
    }

    getProgress(item) {
        if (!item.episodes || item.episodes.length === 0) return item.status === 'Watched' ? 100 : 0;
        const watched = item.episodes.filter(e => e.watched).length;
        return Math.round((watched / item.episodes.length) * 100);
    }

    resetFilters() {
        this.filters = {
            genres: [],
            yearMin: null,
            yearMax: null,
            ratingMin: 0,
            ratingMax: 10,
            runtime: null,
            status_production: 'all',
            sort: 'added_desc'
        };
        this.saveFilters();
    }
}

// Instance globale
const advancedFilterEngine = new AdvancedFilterEngine();

// ==========================================
// UI FUNCTIONS POUR LES FILTRES AVANCÉS
// ==========================================

function renderAdvancedFiltersPanel() {
    const filters = advancedFilterEngine.filters;
    const allGenres = new Set();
    
    // Collecter tous les genres disponibles
    library.forEach(item => {
        (item.genres || []).forEach(g => allGenres.add(g));
    });

    let html = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold text-teal-400">🔧 Filtres Avancés</h3>
                <button onclick="advancedFilterEngine.resetFilters(); renderAdvancedFiltersPanel(); renderLibrary();" 
                    class="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700">
                    ↺ Réinitialiser
                </button>
            </div>

            <!-- Genres -->
            <div>
                <label class="text-xs font-bold text-gray-300 block mb-2">Genres</label>
                <div class="flex flex-wrap gap-1">
    `;

    Array.from(allGenres).sort().forEach(genre => {
        const isSelected = filters.genres.includes(genre);
        const btnClass = isSelected 
            ? 'bg-teal-600 text-white' 
            : 'bg-gray-700 text-gray-300';
        html += `
            <button onclick="toggleGenreFilter('${genre}')" 
                class="text-[9px] px-2 py-1 rounded ${btnClass} transition">
                ${genre}
            </button>
        `;
    });

    html += `
                </div>
            </div>

            <!-- Années -->
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-300 block mb-1">Année min</label>
                    <input type="number" min="1950" max="2100" value="${filters.yearMin || ''}" 
                        onchange="updateYearFilter(this.value, 'min')"
                        class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-300 block mb-1">Année max</label>
                    <input type="number" min="1950" max="2100" value="${filters.yearMax || ''}" 
                        onchange="updateYearFilter(this.value, 'max')"
                        class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                </div>
            </div>

            <!-- Rating -->
            <div>
                <label class="text-xs font-bold text-gray-300 block mb-1">Note: ${filters.ratingMin} - ${filters.ratingMax}</label>
                <div class="flex gap-2 items-center">
                    <input type="range" min="0" max="10" step="0.5" value="${filters.ratingMin}" 
                        onchange="updateRatingFilter(this.value, 'min')"
                        class="flex-1">
                    <input type="range" min="0" max="10" step="0.5" value="${filters.ratingMax}" 
                        onchange="updateRatingFilter(this.value, 'max')"
                        class="flex-1">
                </div>
            </div>

            <!-- Durée -->
            <div>
                <label class="text-xs font-bold text-gray-300 block mb-2">Durée d'épisode</label>
                <select onchange="updateRuntimeFilter(this.value)" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                    <option value="">Indifférent</option>
                    <option value="short" ${filters.runtime === 'short' ? 'selected' : ''}>Court (&lt;30 min)</option>
                    <option value="medium" ${filters.runtime === 'medium' ? 'selected' : ''}>Moyen (30-90 min)</option>
                    <option value="long" ${filters.runtime === 'long' ? 'selected' : ''}>Long (&gt;90 min)</option>
                </select>
            </div>

            <!-- Statut production -->
            <div>
                <label class="text-xs font-bold text-gray-300 block mb-2">Statut diffusion</label>
                <select onchange="updateProductionFilter(this.value)" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                    <option value="all">Tous</option>
                    <option value="running" ${filters.status_production === 'running' ? 'selected' : ''}>En cours</option>
                    <option value="ended" ${filters.status_production === 'ended' ? 'selected' : ''}>Terminé</option>
                    <option value="canceled" ${filters.status_production === 'canceled' ? 'selected' : ''}>Annulé</option>
                </select>
            </div>

            <!-- Tri -->
            <div>
                <label class="text-xs font-bold text-gray-300 block mb-2">Trier par</label>
                <select onchange="updateSortOrder(this.value)" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
    `;

    Object.entries(advancedFilterEngine.sortOptions).forEach(([key, label]) => {
        html += `<option value="${key}" ${filters.sort === key ? 'selected' : ''}>${label}</option>`;
    });

    html += `
                </select>
            </div>
        </div>
    `;

    return html;
}

function toggleGenreFilter(genre) {
    const genres = advancedFilterEngine.filters.genres;
    const idx = genres.indexOf(genre);
    if (idx > -1) {
        genres.splice(idx, 1);
    } else {
        genres.push(genre);
    }
    advancedFilterEngine.saveFilters();
    renderAdvancedFiltersPanel();
    renderLibrary();
}

function updateYearFilter(value, type) {
    if (type === 'min') {
        advancedFilterEngine.setYearRange(value ? parseInt(value) : null, advancedFilterEngine.filters.yearMax);
    } else {
        advancedFilterEngine.setYearRange(advancedFilterEngine.filters.yearMin, value ? parseInt(value) : null);
    }
    renderLibrary();
}

function updateRatingFilter(value, type) {
    if (type === 'min') {
        advancedFilterEngine.setRatingRange(parseFloat(value), advancedFilterEngine.filters.ratingMax);
    } else {
        advancedFilterEngine.setRatingRange(advancedFilterEngine.filters.ratingMin, parseFloat(value));
    }
    renderLibrary();
}

function updateRuntimeFilter(value) {
    advancedFilterEngine.setRuntime(value || null);
    renderLibrary();
}

function updateProductionFilter(value) {
    advancedFilterEngine.setProductionStatus(value);
    renderLibrary();
}

function updateSortOrder(value) {
    advancedFilterEngine.setSort(value);
    renderLibrary();
}
