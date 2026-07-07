// --- UI & RENDER ---

function createMediaCard(media, isLib = false) {
    globalMediaCache.set(media.id, media);
    const isAnime = media.genres?.includes('Anime') || media.genres?.includes('Animation');
    const bgColorClass = media.type === 'movie' ? 'bg-amber-900/60' : (isAnime ? 'bg-purple-900/60' : 'bg-teal-900/60');
    const typeFlag = media.type === 'movie' ? 'FILM' : (isAnime ? 'ANIME' : 'SÉRIE');
    const typeClass = media.type === 'movie' ? 'bg-amber-600' : (isAnime ? 'bg-purple-600' : 'bg-teal-600');

    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-xl border border-gray-700 overflow-hidden cursor-pointer shadow-sm relative flex flex-col hover:border-gray-500 transition-colors';
    div.onclick = () => isLib ? openLibraryModal(media.id) : openPreviewModal(media);
    
    const quickActions = !isLib ? `<div class="mt-auto flex gap-1 pt-1" id="actions-${media.id}">${buildCardActionsHTML(media.id)}</div>` : '';
    const rating = media.rating > 0 ? media.rating.toFixed(1) : 'N/A';
    const ratingOverlay = `<div class="absolute top-1 right-1 bg-black/80 text-yellow-400 text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow border border-gray-800/50">★ ${rating}</div>`;
    const dateOverlay = !isLib && media.premiered ? `<div class="absolute bottom-1 right-1 bg-black/80 text-gray-300 text-[9px] font-black px-1.5 py-0.5 rounded z-10 border border-gray-800/50">${media.premiered}</div>` : '';

    let libOverlay = '';
    let libProgress = '';
    if (isLib && media.type === 'series') {
        const prog = getProgress(media);
        const nextEp = media.episodes?.find(e => !e.watched && e.airdate && e.airdate <= todayString);
        if (media.status === 'Watched') {
            libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-amber-900 border border-gray-700 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Non vu</button>`;
        } else if (media.status === 'Abandoned') {
            libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-red-900 border border-red-700 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Reprendre</button>`;
        } else if (nextEp) {
            libOverlay = `<button onclick="event.stopPropagation(); checkNextEp('${media.id}')" class="absolute bottom-1 right-1 bg-teal-600/90 hover:bg-teal-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">✓ S${nextEp.season}E${nextEp.number}</button>`;
        }
        libProgress = `<div class="absolute bottom-0 inset-x-0 h-1.5 bg-gray-700/80 z-10"><div class="h-full bg-teal-500" style="width:${prog}%"></div></div>`;
    } else if (isLib && media.type === 'movie' && media.status === 'Watched') {
        libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-amber-900 border border-gray-700 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Non vu</button>`;
    }

    const badgeHTML = !isLib ? `<span class="absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded ${typeClass} text-white z-10 shadow">${typeFlag}</span>` : '';
    const titleBg = isLib ? bgColorClass : 'bg-gray-800';

    div.innerHTML = `
        <div class="relative w-full">
            <img src="${media.image || 'https://placehold.co/155x217/1f2937/4b5563'}" class="media-poster bg-gray-900" loading="lazy" />
            ${badgeHTML}
            ${ratingOverlay}
            ${dateOverlay}
            ${libOverlay}
            ${libProgress}
        </div>
        <div class="p-2 flex-1 flex flex-col ${titleBg}">
            <h3 class="font-bold text-white text-[11px] truncate leading-tight">${media.title || 'Inconnu'}</h3>
            ${quickActions}
        </div>
    `;
    return div;
}

function buildCardActionsHTML(mediaId) {
    const inLib = library.some(i => i.id === mediaId);
    if (inLib) return `<button onclick="event.stopPropagation(); handleRemove('${mediaId}')" class="w-full text-center text-[9px] bg-gray-900 hover:bg-red-950 text-gray-500 hover:text-red-400 border border-gray-700 py-1 rounded">✕ Retirer</button>`;
    return `<button onclick="event.stopPropagation(); handleQuickAdd(this.parentElement, '${mediaId}', false)" class="flex-1 text-[9px] bg-teal-600 text-white font-bold py-1 rounded">+ Voir</button>
            <button onclick="event.stopPropagation(); handleQuickAdd(this.parentElement, '${mediaId}', true)" class="flex-1 text-[9px] bg-emerald-700 text-white font-bold py-1 rounded">✓ Vu</button>`;
}

function updateAllCardsUI() {
    document.querySelectorAll('[id^="actions-"]').forEach(el => {
        const id = el.id.replace('actions-', '');
        el.innerHTML = buildCardActionsHTML(id);
    });
}

function switchTab(name) {
    ['search','discover','calendar','library','profile'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`nav-${t}`).classList.replace('text-teal-400', 'text-gray-400');
    });
    document.getElementById(`tab-${name}`).classList.remove('hidden');
    document.getElementById(`nav-${name}`).classList.replace('text-gray-400', 'text-teal-400');
    
    if (name === 'library') renderLibrary();
    if (name === 'discover') renderDiscoverTab();
    if (name === 'profile') renderProfile();
    if (name === 'calendar') renderCalendarTab();
}

function renderSearchGrid(clear = false) {
    const container = document.getElementById('searchResults');
    if (clear) container.innerHTML = '';
    const diffFilter = document.getElementById('searchBroadcastFilter').value;
    let filtered = searchResults.filter(r => r.type === currentMediaType);
    if (currentMediaType === 'series' && diffFilter !== 'all') {
        filtered = filtered.filter(item => {
            const s = (item.status_production || '').toLowerCase();
            if(diffFilter === 'running') return s.includes('running');
            if(diffFilter === 'ended') return s.includes('ended');
            if(diffFilter === 'canceled') return s.includes('cancel');
            return true;
        });
    }
    const start = (searchPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, MAX_RESULTS);
    filtered.slice(start, end).forEach(m => container.appendChild(createMediaCard(m, false)));
}

function renderDiscoverGrid(clear = false) {
    const container = document.getElementById('discoverGrid');
    if(clear) container.innerHTML = '';
    const start = (discoverPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, MAX_RESULTS);
    discoverResults.slice(start, end).forEach(m => container.appendChild(createMediaCard(m, false)));
}

function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    const sFilter = document.getElementById('libraryStatusFilter').value;
    const dFilter = document.getElementById('libraryDiffusionFilter').value;
    const tFilter = document.getElementById('libraryTypeFilter').value;
    const searchInput = document.getElementById('librarySearch').value.toLowerCase().trim();
    grid.innerHTML = '';
    library.filter(item => {
        if(!item || !item.id) return false; 
        if (tFilter !== 'all' && item.type !== tFilter) return false;
        if (sFilter === 'not_finished' && item.status !== 'In Progress') return false;
        if (sFilter === 'watched' && item.status !== 'Watched') return false;
        if (sFilter === 'abandoned' && item.status !== 'Abandoned') return false;
        if (item.type === 'series' && dFilter !== 'all') {
            const sp = (item.status_production || '').toLowerCase();
            const isManualCanceled = item.user_forced_cancel === true;
            if (dFilter === 'canceled' && !isManualCanceled && !sp.includes('cancel')) return false;
            if (dFilter === 'running' && (isManualCanceled || !sp.includes('running'))) return false;
            if (dFilter === 'ended' && (isManualCanceled || !sp.includes('ended'))) return false;
        }
        if (searchInput !== "") {
            const titleMatch = item.title ? item.title.toLowerCase().includes(searchInput) : false;
            const genreMatch = item.genres ? item.genres.some(g => g.toLowerCase().includes(searchInput)) : false;
            const networkMatch = item.network ? item.network.toLowerCase().includes(searchInput) : false;
            if (!titleMatch && !genreMatch && !networkMatch) return false;
        }
        return true;
    }).forEach((item) => { grid.appendChild(createMediaCard(item, true)); });
}

function renderProfile() {
    let totalMin = 0, seriesCount = 0, moviesCount = 0;
    let moviesFinished = 0, totalRating = 0, ratingCount = 0;
    let epWatchedCount = 0, backlogMin = 0;
    const gc = {};
    library.forEach(item => {
        if (item.rating > 0) { totalRating += item.rating; ratingCount++; }
        (item.genres||[]).forEach(g => { gc[g] = (gc[g]||0) + 1; });
        if (item.type === 'movie') { 
            moviesCount++; 
            if(item.status === 'Watched') { totalMin += (item.runtime > 0 ? item.runtime : 120); moviesFinished++; }
            else if (item.status !== 'Watched') { backlogMin += (item.runtime > 0 ? item.runtime : 120); }
        } else {
            seriesCount++;
            (item.episodes||[]).forEach(ep => {
                const rt = item.runtime > 0 ? item.runtime : 40;
                if (ep.watched) { totalMin += rt; epWatchedCount++; }
                else if (!ep.watched && ep.airdate && ep.airdate <= todayString && item.status !== 'Abandoned') { backlogMin += rt; }
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
            </div>`).join('');
    } else { barsEl.innerHTML = `<p class="text-xs text-gray-500 py-2">Aucune donnée de genre.</p>`; }

    const top10El = document.getElementById('stat-top-10');
    const topSeries = library.filter(i => i.type === 'series' && i.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
    top10El.innerHTML = topSeries.length === 0 ? `<p class="text-xs text-gray-500 py-2">Aucune série avec note pour le moment.</p>` : topSeries.map((s, idx) => `<div class="flex items-center gap-3 bg-gray-900/50 p-2 rounded-xl border border-gray-700/50 shadow-sm"><span class="text-teal-500 font-black w-4 text-right">${idx + 1}.</span><img src="${s.image}" class="w-8 h-12 object-cover rounded border border-gray-800" /><div class="flex-1 truncate text-white font-bold text-xs">${s.title}</div><div class="text-yellow-400 font-bold text-[10px] bg-yellow-950/30 px-2 py-1 rounded border border-yellow-700/50">★ ${s.rating.toFixed(1)}</div></div>`).join('');
}

function openPreviewModal(media) {
    modalMode = 'preview';
    document.getElementById('modalTitle').textContent = media.title;
    document.getElementById('modalPoster').src = media.image || 'https://placehold.co/155x217';
    document.getElementById('modalSummary').textContent = media.summary || 'Aucun résumé.';
    document.getElementById('modalPremiereDate').textContent = media.premiered || 'N/A';
    document.getElementById('modalRuntime').textContent = media.runtime > 0 ? `${media.runtime} min` : '-- min';
    document.getElementById('modalNetwork').textContent = media.network || '';
    const rate = media.rating > 0 ? media.rating : 0;
    document.getElementById('modalGlobalRatingText').textContent = rate > 0 ? rate.toFixed(1) : 'N/A';
    document.getElementById('modalGlobalRatingBar').style.width = `${(rate / 10) * 100}%`;
    document.getElementById('btnForceCancel').classList.add('hidden');
    renderProductionBadge(media.status_production, media.user_forced_cancel);
    document.getElementById('modalActionButtonsGrid').classList.remove('hidden');
    document.getElementById('modalSeriesContent').classList.add('hidden');
    document.getElementById('modalProgressContainer').classList.add('hidden');
    document.getElementById('modalSuggestionsBlock').classList.add('hidden');
    
    const followBtn = document.getElementById('modalActionFollowBtn');
    const watchedBtn = document.getElementById('modalActionAllWatchedBtn');
    if (library.some(i => i.id === media.id)) {
        followBtn.textContent = '✕ Retirer';
        followBtn.className = "w-full py-3 bg-gray-900 hover:bg-red-950 text-red-400 border border-red-900/50 font-bold rounded-xl text-xs transition shadow";
        followBtn.onclick = () => { handleRemove(media.id); closeModal(); };
        watchedBtn.classList.remove('hidden');
        watchedBtn.textContent = '↺ Non vu';
        watchedBtn.className = "w-full py-3 bg-gray-900 hover:bg-amber-950 text-amber-400 border border-amber-900/50 font-bold rounded-xl text-xs transition shadow";
        watchedBtn.onclick = () => { resetToUnwatched(media.id); closeModal(); };
    } else {
        watchedBtn.classList.remove('hidden');
        followBtn.textContent = '+ À regarder';
        followBtn.className = "w-full py-3 bg-teal-600 text-white font-bold rounded-xl text-xs shadow transition";
        followBtn.onclick = async () => { followBtn.textContent = 'Ajout...'; await quickAdd(media.id, false); closeModal(); };
        watchedBtn.textContent = '✓ Déjà vu';
        watchedBtn.className = "w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow transition";
        watchedBtn.onclick = async () => { watchedBtn.textContent = 'Ajout...'; await quickAdd(media.id, true); closeModal(); };
    }
    
    if (media.type === 'series') {
        document.getElementById('modalSeriesContent').classList.remove('hidden');
        (async () => {
            try {
                const res = await fetch(`${TVMAZE_API}/shows/${media.apiId}/episodes`);
                const apiEps = await res.json();
                previewEpisodes = apiEps.map(apiEp => ({
                    id: apiEp.id, season: apiEp.season, number: apiEp.number, name: apiEp.name,
                    airdate: apiEp.airdate, runtime: apiEp.runtime, watched: false
                }));
                buildSeasonTabs(previewEpisodes, false);
                renderGlobalGraph(previewEpisodes);
            } catch(e) {}
        })();
    }
    document.getElementById('modalViewSuggestionsBtn').onclick = () => renderSuggestions(media.genres?.[0]||'Anime', media.id);
    document.getElementById('mediaModal').classList.remove('hidden');
}

function openLibraryModal(id) {
    modalMode = 'library';
    const idx = library.findIndex(i => i.id === id);
    activeModalMediaIndex = idx;
    const item = library[idx];
    if(!item) return;
    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalPoster').src = item.image || 'https://placehold.co/155x217';
    document.getElementById('modalSummary').textContent = item.summary;
    document.getElementById('modalPremiereDate').textContent = item.premiered || 'N/A';
    document.getElementById('modalRuntime').textContent = item.runtime > 0 ? `${item.runtime} min` : '-- min';
    document.getElementById('modalNetwork').textContent = item.network || '';
    const rate = item.rating > 0 ? item.rating : 0;
    document.getElementById('modalGlobalRatingText').textContent = rate > 0 ? rate.toFixed(1) : 'N/A';
    document.getElementById('modalGlobalRatingBar').style.width = `${(rate / 10) * 100}%`;
    renderProductionBadge(item.status_production, item.user_forced_cancel);
    const btnCancel = document.getElementById('btnForceCancel');
    if (item.type === 'series') {
        btnCancel.classList.remove('hidden');
        btnCancel.textContent = item.user_forced_cancel ? "Restaurer API Status" : "Force : Marquer Annulée";
    } else { btnCancel.classList.add('hidden'); }
    document.getElementById('modalProgressContainer').classList.add('hidden');
    document.getElementById('modalSuggestionsBlock').classList.add('hidden');
    document.getElementById('modalActionButtonsGrid').classList.remove('hidden');
    const followBtn = document.getElementById('modalActionFollowBtn');
    const watchedBtn = document.getElementById('modalActionAllWatchedBtn');
    followBtn.textContent = '✕ Retirer';
    followBtn.className = "w-full py-3 bg-gray-900 hover:bg-red-950 text-red-400 border border-red-900/50 font-bold rounded-xl text-xs transition shadow";
    followBtn.onclick = () => { handleRemove(item.id); closeModal(); };
    watchedBtn.classList.remove('hidden');
    watchedBtn.textContent = '↺ Non vu';
    watchedBtn.className = "w-full py-3 bg-gray-900 hover:bg-amber-950 text-amber-400 border border-amber-900/50 font-bold rounded-xl text-xs transition shadow";
    watchedBtn.onclick = () => { resetToUnwatched(item.id); closeModal(); };
    if (item.type === 'series' && item.episodes) {
        document.getElementById('modalSeriesContent').classList.remove('hidden');
        const prog = getProgress(item);
        document.getElementById('modalProgressContainer').classList.remove('hidden');
        document.getElementById('modalProgressText').textContent = `${prog}%`;
        document.getElementById('modalProgressBar').style.width = `${prog}%`;
        buildSeasonTabs(item.episodes, true);
        renderGlobalGraph(item.episodes);
    } else {
        document.getElementById('modalSeriesContent').classList.add('hidden');
        document.getElementById('modalEpisodesBlock').classList.add('hidden');
    }
    document.getElementById('modalViewSuggestionsBtn').onclick = () => renderSuggestions(item.genres?.[0]||'Anime', item.id);
    document.getElementById('mediaModal').classList.remove('hidden');
}

function closeModal() {
    suggestionsObserver.disconnect();
    document.getElementById('mediaModal').classList.add('hidden');
    activeModalMediaIndex = null;
    document.getElementById('modalSuggestionsBlock').classList.add('hidden');
}

function renderProductionBadge(status, forcedCanceled) {
    const badge = document.getElementById('modalProductionBadge');
    if(forcedCanceled) { badge.textContent = 'Annulée (Forcé)'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-900 text-red-300'; return; }
    const s = (status || '').toLowerCase();
    if (s.includes('running')) { badge.textContent = 'En cours'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-400'; }
    else if (s.includes('ended')) { badge.textContent = 'Terminée'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300'; }
    else if (s.includes('cancel')) { badge.textContent = 'Annulée'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900 text-red-400'; }
    else { badge.textContent = status || ''; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300'; }
}

function buildSeasonTabs(episodes, isLib) {
    const seasons = [...new Set(episodes.map(e => e.season))];
    const tabs = document.getElementById('modalSeasonTabs');
    tabs.innerHTML = '';
    document.getElementById('modalEpisodesBlock').classList.remove('hidden');
    seasons.forEach((s, i) => {
        const btn = document.createElement('button');
        const colorClass = seasonColors[(s - 1) % seasonColors.length] || 'bg-teal-600';
        btn.className = `px-3 py-1 text-xs font-bold rounded-lg shrink-0 ${i===0? `${colorClass} text-white`:'bg-gray-700 text-gray-300'}`;
        btn.textContent = `S${s}`;
        btn.onclick = (e) => {
            Array.from(tabs.children).forEach(b=>b.className = 'px-3 py-1 text-xs font-bold rounded-lg shrink-0 bg-gray-700 text-gray-300');
            e.target.className = `px-3 py-1 text-xs font-bold rounded-lg shrink-0 ${colorClass} text-white`;
            renderEpisodes(episodes.filter(ep => ep.season === s), isLib);
        };
        tabs.appendChild(btn);
    });
    if (seasons.length > 0) renderEpisodes(episodes.filter(ep => ep.season === seasons[0]), isLib);
}

function renderEpisodes(eps, isLib) {
    const list = document.getElementById('modalEpisodesList');
    renderSeasonGraph(eps);
    list.innerHTML = eps.map(ep => {
        const isReleased = ep.airdate && ep.airdate <= todayString;
        const isFuture = !isReleased;
        const dateSpan = isFuture ? `<span class="text-amber-400 font-bold ml-1">${ep.airdate||'TBA'}</span>` : `<span class="text-gray-500 ml-1">${ep.airdate || ''}</span>`;
        const btnClass = isFuture ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30' : (ep.watched ? 'bg-emerald-900 text-emerald-400 hover:bg-emerald-800' : 'bg-gray-700 hover:bg-gray-600');
        const btnAction = isLib ? `<button onclick="event.stopPropagation(); ${!isFuture ? `toggleEpCascade(${ep.id}, '${ep.season}')` : ''}" class="px-2 py-1 rounded text-[10px] shrink-0 font-bold transition ${btnClass}" ${isFuture?'disabled':''}>${ep.watched ? '✓ Vu' : 'Vu'}</button>` : '';
        return `
        <div class="flex flex-col gap-1">
            <div class="p-2 rounded-xl bg-gray-900/60 border border-gray-700/50 text-xs flex justify-between items-center">
                <span class="truncate text-gray-300">E${ep.number} – <b class="text-white">${ep.name || 'Épisode '+ep.number}</b> ${dateSpan}</span>
                ${btnAction}
            </div>
        </div>`;
    }).join('');
}

function renderGlobalGraph(eps) {
    const container = document.getElementById('modalGlobalGraph');
    container.innerHTML = '';
    eps.forEach(ep => {
        const r = ep.ratingSource || (ep.rating?.average) || 7.0;
        const h = Math.max(10, (r / 10) * 100);
        const colorClass = seasonColors[(ep.season - 1) % seasonColors.length] || 'bg-teal-500';
        container.innerHTML += `<div class="flex-1 min-w-[4px] ${colorClass} hover:opacity-80 rounded-t cursor-pointer relative z-10" style="height: ${h}%" title="S${ep.season}E${ep.number}: ${r}"></div>`;
    });
}

function renderSeasonGraph(eps) {
    const container = document.getElementById('modalSeasonGraph');
    container.innerHTML = '';
    eps.forEach(ep => {
        const r = ep.ratingSource || (ep.rating?.average) || 7.0;
        const h = Math.max(10, (r / 10) * 100);
        const colorClass = seasonColors[(ep.season - 1) % seasonColors.length] || 'bg-cyan-600';
        container.innerHTML += `<div class="flex-1 min-w-[12px] ${colorClass} hover:opacity-80 rounded-t cursor-pointer flex flex-col justify-end items-center relative z-10" style="height: ${h}%" title="E${ep.number}: ${r}"><span class="text-[8px] text-white font-bold mb-0.5 opacity-80">${r}</span></div>`;
    });
}

function getProgress(item) {
    if (!item.episodes || item.episodes.length === 0) return item.status === 'Watched' ? 100 : 0;
    const watched = item.episodes.filter(e => e.watched).length;
    return Math.round((watched / item.episodes.length) * 100);
}

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

function applySmartFilter(keyword) {
    if(keyword === 'movie') { document.getElementById('libraryTypeFilter').value = 'movie'; document.getElementById('librarySearch').value = ''; }
    else { document.getElementById('libraryTypeFilter').value = 'all'; document.getElementById('librarySearch').value = keyword; }
    renderLibrary();
}

async function renderSuggestions(genre, currentId) {
    const block = document.getElementById('modalSuggestionsBlock');
    block.classList.remove('hidden');
    block.innerHTML = `<div id="modalSuggestionsList" class="space-y-2"></div><div id="modalSuggestionsSentinel" class="h-4"></div>`;
    try {
        await ensureShowsPool();
        modalSuggestionsPool = showsCache.filter(s => s.genres?.includes(genre) && `series-${s.id}` !== currentId).sort(() => 0.5 - Math.random());
        modalSuggestionsPage = 1;
        suggestionsObserver.disconnect();
        const sent = document.getElementById('modalSuggestionsSentinel');
        if (sent) suggestionsObserver.observe(sent);
        appendSuggestions(true);
    } catch(e) { console.error("Erreur suggestions", e); }
}

function appendSuggestions(clear = false) {
    const list = document.getElementById('modalSuggestionsList');
    if(clear) list.innerHTML = '';
    const slice = modalSuggestionsPool.slice((modalSuggestionsPage - 1) * 8, modalSuggestionsPage * 8);
    slice.forEach(show => {
        const n = normalizeShow(show);
        const rate = n.rating > 0 ? n.rating.toFixed(1) : 'N/A';
        const div = document.createElement('div');
        div.className = 'bg-gray-900 border border-gray-700 p-2 rounded-xl flex gap-3 items-center';
        div.innerHTML = `<img src="${n.image || 'https://placehold.co/40x60'}" class="w-12 h-16 object-cover rounded cursor-pointer shrink-0 border border-gray-800" onclick='closeModal(); openPreviewModal(${JSON.stringify(n).replace(/'/g, "&#39;")})' /><div class="flex-1 min-w-0 cursor-pointer" onclick='closeModal(); openPreviewModal(${JSON.stringify(n).replace(/'/g, "&#39;")})'><h4 class="text-xs font-bold text-white truncate">${n.title}</h4><div class="flex items-center gap-1.5 mt-1"><span class="text-[9px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">${n.premiered}</span><span class="text-[9px] text-yellow-400 font-bold ml-1 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50">★ ${rate}</span></div></div><div class="flex flex-col gap-1 w-20 shrink-0" id="actions-${n.id}">${buildCardActionsHTML(n.id)}</div>`;
        list.appendChild(div);
    });
}

function setCalFilter(f) {
    calFilter = f;
    ['all','today','week','month'].forEach(id => {
        const btn = document.getElementById(`cal-${id}`);
        if (btn) btn.className = id === f ? 'shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold bg-teal-600 text-white' : 'shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold bg-gray-800 text-gray-400 border border-gray-700';
    });
    renderCalendarTab();
}

function renderCalendarTab() {
    const container = document.getElementById('calendarTimeline');
    container.innerHTML = '';
    const today = new Date(); today.setHours(0,0,0,0);
    let futureEps = [];
    library.forEach(item => {
        if (item.type === 'movie') {
            if (item.premiered && item.premiered.length >= 4 && item.premiered >= todayString && item.status !== 'Watched') {
                if (calFilter === 'today' && item.premiered !== todayString) return;
                futureEps.push({ mediaId: item.id, showTitle: item.title, showImage: item.image, epName: 'SORTIE FILM', season: null, number: null, airdate: item.premiered, type: 'movie' });
            }
        } else {
            (item.episodes||[]).forEach(ep => {
                if (!ep.airdate || ep.watched || item.status === 'Abandoned') return;
                if (ep.airdate < todayString) return;
                if (calFilter === 'today' && ep.airdate !== todayString) return;
                if (calFilter === 'week') {
                    const epDate = new Date(ep.airdate); epDate.setHours(0,0,0,0);
                    if ((epDate - today) / 86400000 > 7) return;
                }
                if (calFilter === 'month') {
                    const epDate = new Date(ep.airdate);
                    if (epDate.getMonth() !== today.getMonth() || epDate.getFullYear() !== today.getFullYear()) return;
                }
                futureEps.push({ mediaId: item.id, showTitle: item.title, showImage: item.image, epName: ep.name, season: ep.season, number: ep.number, airdate: ep.airdate, type: 'series' });
            });
        }
    });
    if (!futureEps.length) { container.innerHTML = `<p class="text-xs text-gray-500 text-center py-12">Aucune sortie planifiée.</p>`; return; }
    futureEps.sort((a,b) => a.airdate.localeCompare(b.airdate));
    const groups = {};
    futureEps.forEach(ep => { if (!groups[ep.airdate]) groups[ep.airdate] = []; groups[ep.airdate].push(ep); });
    Object.entries(groups).forEach(([date, eps]) => {
        const diff = Math.ceil((new Date(date) - today) / 86400000);
        const label = diff === 0 ? "Aujourd'hui 🎉" : diff === 1 ? "Demain" : `<span class="text-[#FFD700] font-black drop-shadow-md">J-${diff}</span>`;
        container.innerHTML += `<div class="text-[11px] font-black text-teal-400 uppercase tracking-wider mt-3 mb-1">${label}</div>`;
        eps.forEach(ep => {
            const subTxt = ep.type === 'movie' ? `<span class="text-amber-500 font-bold bg-amber-900/30 px-1 py-0.5 rounded">SORTIE FILM</span>` : `S${ep.season}E${ep.number} – ${ep.epName}`;
            container.innerHTML += `
            <div onclick="openLibraryModal('${ep.mediaId}')" class="bg-gray-800 border border-gray-700 p-3 rounded-xl flex gap-3 items-center shadow cursor-pointer hover:border-gray-500 transition">
                <img src="${ep.showImage}" class="w-10 h-14 object-cover rounded-lg bg-gray-900 shrink-0" />
                <div class="flex-1 min-w-0">
                    <div class="text-[9px] uppercase font-black text-teal-400 truncate">${ep.showTitle}</div>
                    <h4 class="font-bold text-white text-xs truncate mt-0.5">${subTxt}</h4>
                    <span class="text-[10px] text-gray-500">${ep.airdate}</span>
                </div>
            </div>`;
        });
    });
}
