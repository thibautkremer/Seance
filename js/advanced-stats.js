// ==========================================
// ADVANCED-STATS.JS — Statistiques avec format de temps et ratios
// ==========================================

function formatDuration(hours) {
    if (!hours || hours <= 0) return "0h";
    const totalDays = hours / 24;
    const years = Math.floor(totalDays / 365);
    const remDays = totalDays % 365;
    const months = Math.floor(remDays / 30);
    const days = Math.floor(remDays % 30);
    const h = Math.floor(hours % 24);

    let parts = [];
    if (years > 0) parts.push(`${years} an(s)`);
    if (months > 0) parts.push(`${months} mois`);
    if (days > 0) parts.push(`${days} j`);
    if (h > 0 || parts.length === 0) parts.push(`${h}h`);
    return parts.join(', ');
}

class AdvancedStatsEngine {
    constructor() { this.statsCache = new Map(); }

    calculateAllStats() {
        return {
            overview: this.getOverviewStats(),
            achievements: this.getAchievements()
        };
    }

    getOverviewStats() {
        let totalHours = 0; let backlogHours = 0;
        let episodesAdded = 0; let episodesWatched = 0;
        let moviesAdded = 0; let moviesWatched = 0;

        library.forEach(item => {
            if (item.type === 'series') {
                const avgRuntime = item.runtime || 42;
                item.episodes?.forEach(ep => {
                    episodesAdded++;
                    if (ep.watched) {
                        totalHours += avgRuntime / 60;
                        episodesWatched++;
                    } else {
                        backlogHours += avgRuntime / 60;
                    }
                });
            } else if (item.type === 'movie') {
                moviesAdded++;
                const runtime = item.runtime || 120;
                if (item.status === 'Watched') {
                    totalHours += runtime / 60;
                    moviesWatched++;
                } else {
                    backlogHours += runtime / 60;
                }
            }
        });

        return {
            totalTimeStr: formatDuration(totalHours),
            backlogTimeStr: formatDuration(backlogHours),
            episodesAdded, episodesWatched,
            moviesAdded, moviesWatched,
            episodesPercent: episodesAdded > 0 ? Math.round((episodesWatched / episodesAdded) * 100) : 0,
            moviesPercent: moviesAdded > 0 ? Math.round((moviesWatched / moviesAdded) * 100) : 0,
            avgRating: this.getAverageRating()
        };
    }

    getAverageRating() {
        let sum = 0; let count = 0;
        library.forEach(item => {
            if (item.user_rating && item.user_rating > 0) {
                sum += item.user_rating;
                count++;
            }
        });
        return count > 0 ? (Math.round((sum / count) * 10) / 10) : 0;
    }

    getAchievements() {
        const overview = this.getOverviewStats();
        const achievements = [];
        if (overview.episodesWatched >= 100) achievements.push({ id: 'centennial', name: '🎬 Centenaire', desc: '100+ épisodes vus' });
        if (overview.episodesWatched >= 1000) achievements.push({ id: 'binge_master', name: '📺 Maître du Binge', desc: '1000+ épisodes vus' });
        if (overview.moviesWatched >= 50) achievements.push({ id: 'cinephile', name: '🍿 Cinéphile', desc: '50+ films vus' });
        return achievements;
    }
}

const advancedStats = new AdvancedStatsEngine();

function renderAdvancedStatsPanel() {
    const stats = advancedStats.calculateAllStats();
    
    let html = `
        <div class="space-y-4">
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 class="text-sm font-bold text-teal-400 mb-3">📈 Statistiques de Visionnage</h3>
                
                <div class="grid grid-cols-1 gap-2 mb-3">
                    <div class="bg-gray-900 p-3 rounded text-center">
                        <div class="text-sm font-black text-teal-400">${stats.overview.totalTimeStr}</div>
                        <div class="text-[10px] text-gray-400">Temps total devant l'écran</div>
                    </div>
                    <div class="bg-gray-900 p-3 rounded text-center">
                        <div class="text-sm font-black text-emerald-400">${stats.overview.backlogTimeStr}</div>
                        <div class="text-[10px] text-gray-400">Temps restant (Backlog)</div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-gray-900 p-2 rounded text-center flex flex-col justify-center">
                        <div class="text-lg font-black text-amber-400">${stats.overview.avgRating}/10</div>
                        <div class="text-[9px] text-gray-400">Note moyenne</div>
                    </div>
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-[10px] font-black text-purple-400">${stats.overview.episodesWatched} / ${stats.overview.episodesAdded}</div>
                        <div class="text-sm font-bold text-white">${stats.overview.episodesPercent}%</div>
                        <div class="text-[9px] text-gray-400">Épisodes vus</div>
                    </div>
                    <div class="bg-gray-900 p-2 rounded text-center">
                        <div class="text-[10px] font-black text-blue-400">${stats.overview.moviesWatched} / ${stats.overview.moviesAdded}</div>
                        <div class="text-sm font-bold text-white">${stats.overview.moviesPercent}%</div>
                        <div class="text-[9px] text-gray-400">Films vus</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Injection des achievements dans le panneau caché de l'index.html
    setTimeout(() => {
        const achPanel = document.getElementById('achievementsPanel');
        if(achPanel) {
            let achHtml = '<div class="grid grid-cols-2 gap-2">';
            stats.achievements.forEach(a => {
                achHtml += `
                <div class="bg-gray-900 p-2 rounded text-center text-[10px] border border-gray-700">
                    <div class="text-lg mb-1">${a.name.split(' ')[0]}</div>
                    <div class="text-gray-400 line-clamp-2">${a.desc}</div>
                </div>`;
            });
            achHtml += '</div>';
            achPanel.innerHTML = achHtml;
        }
    }, 100);

    return html;
}
