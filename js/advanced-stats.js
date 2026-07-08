// ==========================================
// ADVANCED-STATS.JS — Statistiques avancées et analyses
// ==========================================

/**
 * Moteur d'analyse et de statistiques avancées
 */

class AdvancedStatsEngine {
    constructor() {
        this.statsCache = new Map();
    }

    /**
     * Calcule toutes les statistiques
     */
    calculateAllStats() {
        const cacheKey = 'all_stats_' + Date.now();
        
        return {
            overview: this.getOverviewStats(),
            genres: this.getGenreStats(),
            networks: this.getNetworkStats(),
            timeline: this.getTimelineStats(),
            viewingHabits: this.getViewingHabits(),
            achievements: this.getAchievements(),
            predictions: this.getPredictions()
        };
    }

    /**
     * Statistiques générales
     */
    getOverviewStats() {
        let totalHours = 0;
        let backlogHours = 0;
        let seriesCount = 0;
        let moviesCount = 0;
        let episodesWatched = 0;
        let moviesWatched = 0;
        const statuses = { watched: 0, inProgress: 0, abandoned: 0 };

        library.forEach(item => {
            if (item.type === 'series') {
                seriesCount++;
                const avgRuntime = item.runtime || 42;
                
                item.episodes?.forEach(ep => {
                    if (ep.watched) {
                        totalHours += avgRuntime / 60;
                        episodesWatched++;
                    } else if (!ep.airdate || ep.airdate <= todayString) {
                        backlogHours += avgRuntime / 60;
                    }
                });
            } else {
                moviesCount++;
                const runtime = item.runtime || 120;
                if (item.status === 'Watched') {
                    totalHours += runtime / 60;
                    moviesWatched++;
                } else {
                    backlogHours += runtime / 60;
                }
            }

            statuses[item.status === 'Watched' ? 'watched' : item.status === 'In Progress' ? 'inProgress' : 'abandoned']++;
        });

        return {
            totalHours: Math.round(totalHours * 10) / 10,
            backlogHours: Math.round(backlogHours * 10) / 10,
            seriesCount,
            moviesCount,
            totalCount: seriesCount + moviesCount,
            episodesWatched,
            moviesWatched,
            avgRating: this.getAverageRating(),
            statuses
        };
    }

    /**
     * Statistiques par genre
     */
    getGenreStats() {
        const genres = {};

        library.forEach(item => {
            (item.genres || []).forEach(genre => {
                if (!genres[genre]) {
                    genres[genre] = { count: 0, watched: 0, avgRating: 0, totalRating: 0 };
                }
                genres[genre].count++;
                if (item.status === 'Watched') genres[genre].watched++;
                genres[genre].totalRating += item.rating || 0;
            });
        });

        // Calculer les moyennes
        Object.keys(genres).forEach(genre => {
            genres[genre].avgRating = genres[genre].count > 0 
                ? Math.round((genres[genre].totalRating / genres[genre].count) * 10) / 10
                : 0;
        });

        return Object.entries(genres)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20)
            .reduce((acc, [genre, data]) => {
                acc[genre] = data;
                return acc;
            }, {});
    }

    /**
     * Statistiques par réseau/plateforme
     */
    getNetworkStats() {
        const networks = {};

        library.forEach(item => {
            const network = item.network || 'Unknown';
            if (!networks[network]) {
                networks[network] = { count: 0, watched: 0, avgRating: 0, totalRating: 0 };
            }
            networks[network].count++;
            if (item.status === 'Watched') networks[network].watched++;
            networks[network].totalRating += item.rating || 0;
        });

        Object.keys(networks).forEach(network => {
            networks[network].avgRating = networks[network].count > 0
                ? Math.round((networks[network].totalRating / networks[network].count) * 10) / 10
                : 0;
        });

        return Object.entries(networks)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 15)
            .reduce((acc, [network, data]) => {
                acc[network] = data;
                return acc;
            }, {});
    }

    /**
     * Évolution temporelle du visionnage
     */
    getTimelineStats() {
        const now = new Date();
        const timeline = {
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
            allTime: 0
        };

        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        library.forEach(item => {
            if (!item.last_modified) return;
            const itemDate = new Date(item.last_modified);

            if (itemDate >= weekAgo) timeline.thisWeek++;
            if (itemDate >= monthAgo) timeline.thisMonth++;
            if (itemDate >= yearAgo) timeline.thisYear++;
            timeline.allTime++;
        });

        return timeline;
    }

    /**
     * Habitudes de visionnage
     */
    getViewingHabits() {
        const habits = {
            preferredType: 'series', // 'series' or 'movie'
            averageRatingGiven: 0,
            bingableSeriesCount: 0, // < 50 épisodes
            longSeriesCount: 0,     // > 50 épisodes
            abandonmentRate: 0,
            completionRate: 0
        };

        let seriesAbandoned = 0;
        let seriesCompleted = 0;
        let totalSeries = 0;
        let ratingCount = 0;
        let ratingSum = 0;

        library.forEach(item => {
            if (item.user_rating) {
                ratingSum += item.user_rating;
                ratingCount++;
            }

            if (item.type === 'series') {
                totalSeries++;
                if (item.status === 'Abandoned') seriesAbandoned++;
                if (item.status === 'Watched') seriesCompleted++;

                const episodeCount = item.episodes?.length || 0;
                if (episodeCount < 50) habits.bingableSeriesCount++;
                else habits.longSeriesCount++;
            }
        });

        // Déterminer le type préféré
        const movieCount = library.filter(l => l.type === 'movie').length;
        habits.preferredType = totalSeries > movieCount ? 'series' : 'movie';
        habits.averageRatingGiven = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
        habits.abandonmentRate = totalSeries > 0 ? Math.round((seriesAbandoned / totalSeries) * 100) : 0;
        habits.completionRate = totalSeries > 0 ? Math.round((seriesCompleted / totalSeries) * 100) : 0;

        return habits;
    }

    /**
     * Réalisations/Achievements
     */
    getAchievements() {
        const achievements = [];
        const overview = this.getOverviewStats();

        // Achievements basés sur les statistiques
        if (overview.totalHours >= 100) {
            achievements.push({ id: 'centennial', name: '🎬 Centenaire', desc: '100+ heures regardées' });
        }
        if (overview.totalHours >= 500) {
            achievements.push({ id: 'cinephile', name: '🍿 Cinéphile', desc: '500+ heures regardées' });
        }
        if (overview.episodesWatched >= 1000) {
            achievements.push({ id: 'binge_master', name: '📺 Maître du Binge', desc: '1000+ épisodes vus' });
        }
        if (overview.seriesCount >= 50) {
            achievements.push({ id: 'collection_master', name: '🎯 Collectionneur', desc: '50+ séries suivies' });
        }
        if (overview.statuses.inProgress === 0) {
            achievements.push({ id: 'perfectionist', name: '✨ Perfectionniste', desc: 'Pas de séries en cours' });
        }

        const habits = this.getViewingHabits();
        if (habits.completionRate >= 80) {
            achievements.push({ id: 'completionist', name: '🏆 Réalisateur', desc: '80%+ de séries finies' });
        }

        return achievements;
    }

    /**
     * Prédictions et recommandations
     */
    getPredictions() {
        const overview = this.getOverviewStats();
        const predictions = {
            daysToFinishBacklog: 0,
            nextGenreTrend: '',
            recommendedShowType: ''
        };

        // Jours pour finir le backlog (en supposant 1h par jour)
        predictions.daysToFinishBacklog = Math.ceil(overview.backlogHours);

        // Genre tendance
        const genres = this.getGenreStats();
        if (Object.keys(genres).length > 0) {
            predictions.nextGenreTrend = Object.entries(genres)
                .sort((a, b) => b[1].watched - a[1].watched)[0][0];
        }

        // Type recommandé
        const habits = this.getViewingHabits();
        predictions.recommendedShowType = habits.preferredType === 'series' 
            ? habits.bingableSeriesCount > habits.longSeriesCount ? 'Mini-séries' : 'Longues séries'
            : 'Films';

        return predictions;
    }

    /**
     * Note moyenne
     */
    getAverageRating() {
        const ratings = library
            .filter(item => item.user_rating && item.user_rating > 0)
            .map(item => item.user_rating);

        return ratings.length > 0 
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : 0;
    }

    /**
     * Génère un rapport annuel
     */
    generateAnnualReport() {
        const stats = this.calculateAllStats();
        const year = new Date().getFullYear();

        return `
# Rapport Annuel TV TIME REBORN - ${year}

## 📊 Vue d'ensemble
- **Heures regardées:** ${stats.overview.totalHours}h
- **Backlog restant:** ${stats.overview.backlogHours}h
- **Jours pour finir:** ${Math.ceil(stats.overview.backlogHours)} (à raison de 1h/jour)

## 📺 Collections
- **Séries suivies:** ${stats.overview.seriesCount}
- **Films suivis:** ${stats.overview.moviesCount}
- **Épisodes vus:** ${stats.overview.episodesWatched}
- **Films regardés:** ${stats.overview.moviesWatched}

## 📈 Habitudes
- **Type préféré:** ${stats.viewingHabits.preferredType === 'series' ? 'Séries' : 'Films'}
- **Taux de complétion:** ${stats.viewingHabits.completionRate}%
- **Taux d'abandon:** ${stats.viewingHabits.abandonmentRate}%
- **Note moyenne donnée:** ${stats.viewingHabits.averageRatingGiven}/10

## 🎯 Top Genres
${Object.entries(stats.genres).slice(0, 5).map(([g, d]) => 
    `- **${g}**: ${d.count} (${d.watched} terminé, note: ${d.avgRating}/10)`
).join('\n')}

## 🏆 Achievements débloquées
${stats.achievements.map(a => `- ${a.name}: ${a.desc}`).join('\n')}

## 🔮 Prédictions
- **Prochain genre populaire:** ${stats.predictions.nextGenreTrend}
- **Type recommandé:** ${stats.predictions.recommendedShowType}
        `;
    }

    /**
     * Exporte le rapport en PDF (nécessite une lib comme jsPDF)
     */
    exportReportPDF() {
        const report = this.generateAnnualReport();
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv-time-report-${new Date().getFullYear()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccessMessage('Rapport exporté');
    }
}

// Instance globale
const advancedStats = new AdvancedStatsEngine();

// ==========================================
// UI FUNCTIONS POUR LES STATS AVANCÉES
// ==========================================

function renderAdvancedStatsPanel() {
    const stats = advancedStats.calculateAllStats();
    
    let html = `
        <div class="space-y-4">
            <!-- Stats Avancées -->
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 class="text-sm font-bold text-teal-400 mb-3">📈 Statistiques Avancées</h3>
                
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-lg font-black text-teal-400">${stats.overview.totalHours}h</div>
                        <div class="text-[9px] text-gray-400">Heures regardées</div>
                    </div>
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-lg font-black text-purple-400">${stats.viewingHabits.completionRate}%</div>
                        <div class="text-[9px] text-gray-400">Taux de complétion</div>
                    </div>
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-lg font-black text-amber-400">${stats.overview.averageRating}/10</div>
                        <div class="text-[9px] text-gray-400">Note moyenne</div>
                    </div>
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-lg font-black text-emerald-400">${stats.predictions.daysToFinishBacklog}j</div>
                        <div class="text-[9px] text-gray-400">Pour finir le backlog</div>
                    </div>
                </div>

                <!-- Genres Top -->
                <div class="mt-3">
                    <h4 class="text-xs font-bold text-gray-400 mb-2">Top Genres</h4>
                    <div class="space-y-1">
    `;

    Object.entries(stats.genres).slice(0, 5).forEach(([genre, data]) => {
        const width = (data.count / Object.values(stats.genres)[0].count * 100);
        html += `
            <div>
                <div class="flex justify-between text-[9px] mb-0.5">
                    <span class="text-gray-300">${genre}</span>
                    <span class="text-gray-500">${data.count} (⭐${data.avgRating})</span>
                </div>
                <div class="h-1.5 bg-gray-700 rounded overflow-hidden">
                    <div class="h-full bg-teal-500" style="width: ${width}%"></div>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>
            </div>

            <!-- Achievements -->
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 class="text-sm font-bold text-teal-400 mb-3">🏆 Achievements</h3>
                <div class="grid grid-cols-2 gap-2">
    `;

    stats.achievements.forEach(achievement => {
        html += `
            <div class="bg-gray-900 p-2 rounded text-center text-[10px]">
                <div class="text-lg mb-1">${achievement.name.split(' ')[0]}</div>
                <div class="text-gray-400 line-clamp-2">${achievement.desc}</div>
            </div>
        `;
    });

    html += `
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
                <button onclick="advancedStats.exportReportPDF()" 
                    class="flex-1 text-xs px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded transition font-bold">
                    📊 Export Rapport
                </button>
            </div>
        </div>
    `;

    return html;
}
