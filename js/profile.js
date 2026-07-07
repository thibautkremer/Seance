// ==========================================
// PROFILE.JS — Onglet Profil (statistiques, graphes, top 10)
// ==========================================

    // --- PROFIL ---
    function formatDuration(totalMin) {
        if (isNaN(totalMin) || totalMin <= 0) return '0 h';
        let r = Math.max(0, Math.round(totalMin));
        const days = Math.floor(r/(24*60)); r -= days*24*60;
        const hours = Math.floor(r/60);
        const parts = [];
        if (days) parts.push(`${days} j`);
        if (hours||!parts.length) parts.push(`${hours} h`);
        return parts.join(' ');
    }

    function renderProfile() {
        let totalMin = 0, seriesCount = 0, moviesCount = 0;
        let seriesFinished = 0, moviesFinished = 0, totalRating = 0, ratingCount = 0;
        let epWatchedCount = 0, backlogMin = 0;
        const gc = {};
        
        library.forEach(item => {
            if (item.rating > 0) { totalRating += item.rating; ratingCount++; }
            (item.genres||[]).forEach(g => { gc[g] = (gc[g]||0) + 1; });

            if (item.type === 'movie') { 
                moviesCount++; 
                if(item.status === 'Watched') {
                    totalMin += (item.runtime > 0 ? item.runtime : 120); 
                    moviesFinished++;
                } else if (item.status !== 'Watched') {
                    backlogMin += (item.runtime > 0 ? item.runtime : 120);
                }
            } else {
                seriesCount++;
                if(item.status === 'Watched') seriesFinished++;
                (item.episodes||[]).forEach(ep => {
                    const rt = item.runtime > 0 ? item.runtime : 40;
                    if (ep.watched) { 
                        totalMin += rt; 
                        epWatchedCount++;
                    } else if (!ep.watched && ep.airdate && ep.airdate <= todayString && item.status !== 'Abandoned') {
                        backlogMin += rt;
                    }
                });
            }
        });

        document.getElementById('stat-hours').textContent = formatDuration(totalMin);
        document.getElementById('stat-backlog-hours').textContent = formatDuration(backlogMin);
        document.getElementById('stat-series').textContent = seriesCount;
        document.getElementById('stat-episodes-watched').textContent = epWatchedCount;
        document.getElementById('stat-movies-finished').textContent = moviesFinished;
        document.getElementById('stat-avg-rating').textContent = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 'N/A';
        
        const totalMedia = seriesCount + moviesCount;
        const pctSeries = totalMedia > 0 ? Math.round((seriesCount / totalMedia) * 100) : 0;
        const pctMovies = totalMedia > 0 ? 100 - pctSeries : 0;
        
        document.getElementById('pieTotal').textContent = totalMedia;
        document.getElementById('pieSeries').setAttribute('stroke-dasharray', `${pctSeries}, 100`);
        document.getElementById('pieMovies').setAttribute('stroke-dasharray', `${pctMovies}, 100`);
        document.getElementById('pieMovies').setAttribute('stroke-dashoffset', `-${pctSeries}`);
        document.getElementById('pieSeriesText').textContent = `${pctSeries}%`;
        document.getElementById('pieMoviesText').textContent = `${pctMovies}%`;

        const sortedGenres = Object.entries(gc).sort((a,b)=>b[1]-a[1]);
        const barsEl = document.getElementById('stat-genre-bars');
        if (sortedGenres.length) {
            const max = sortedGenres[0][1];
            barsEl.innerHTML = sortedGenres.slice(0,5).map(([g,c]) => `
                <div>
                    <div class="flex justify-between text-[10px] mb-1 font-bold">
                        <span class="text-gray-300">${g}</span>
                        <span class="text-teal-500">${c}</span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                        <div class="h-full bg-teal-500" style="width:${Math.round(c/max*100)}%"></div>
                    </div>
                </div>
            `).join('');
        } else {
            barsEl.innerHTML = `<p class="text-xs text-gray-500 py-2">Aucune donnée de genre.</p>`;
        }

        const top10El = document.getElementById('stat-top-10');
        const topSeries = library.filter(i => i.type === 'series' && i.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
        
        if(topSeries.length === 0) {
            top10El.innerHTML = `<p class="text-xs text-gray-500 py-2">Aucune série avec note pour le moment.</p>`;
        } else {
            top10El.innerHTML = topSeries.map((s, idx) => `
                <div class="flex items-center gap-3 bg-gray-900/50 p-2 rounded-xl border border-gray-700/50 shadow-sm">
                    <span class="text-teal-500 font-black w-4 text-right">${idx + 1}.</span>
                    <img src="${s.image}" class="w-8 h-12 object-cover rounded border border-gray-800" />
                    <div class="flex-1 truncate text-white font-bold text-xs">${s.title}</div>
                    <div class="text-yellow-400 font-bold text-[10px] bg-yellow-950/30 px-2 py-1 rounded border border-yellow-700/50">★ ${s.rating.toFixed(1)}</div>
                </div>
            `).join('');
        }
    }
