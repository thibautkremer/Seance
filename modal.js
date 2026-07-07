// ==========================================
// MODAL.JS — Modale de détail (preview + bibliothèque), graphes, épisodes, quickAdd, mise à jour massive
// ==========================================

    async function openPreviewModal(media) {
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
        } else {
            btnCancel.classList.add('hidden');
        }

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
        // C'est l'étape cruciale pour éviter l'erreur de "null element" à la réouverture
        suggestionsObserver.disconnect();
        
        document.getElementById('mediaModal').classList.add('hidden');
        activeModalMediaIndex = null;
        
        // Optionnel : Nettoyer le contenu pour qu'il soit vide à la prochaine ouverture
        document.getElementById('modalSuggestionsBlock').classList.add('hidden');
    }

    // --- GRAPHES ---
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

    function renderProductionBadge(status, forcedCanceled) {
        const badge = document.getElementById('modalProductionBadge');
        if(forcedCanceled) { badge.textContent = 'Annulée (Forcé)'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-900 text-red-300'; return; }
        const s = (status || '').toLowerCase();
        if (s.includes('running')) { badge.textContent = 'En cours'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-400'; }
        else if (s.includes('ended')) { badge.textContent = 'Terminée'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300'; }
        else if (s.includes('cancel')) { badge.textContent = 'Annulée'; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900 text-red-400'; }
        else { badge.textContent = status || ''; badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300'; }
    }

    function toggleForceCancel() {
        if(activeModalMediaIndex === null) return;
        const item = library[activeModalMediaIndex];
        item.user_forced_cancel = !item.user_forced_cancel;
        item.last_modified = Date.now();
        saveLocalDB(item.id);
        openLibraryModal(item.id); 
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

    // --- EPISODES ---
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

    function toggleEpCascade(epId, seasonStr) {
        const item = library[activeModalMediaIndex];
        const epIndex = item.episodes.findIndex(e => e.id === epId);
        if (epIndex === -1) return;
        
        const targetState = !item.episodes[epIndex].watched;
        
        if (targetState) {
            for(let i=0; i<=epIndex; i++) item.episodes[i].watched = true;
        } else {
            for(let i=epIndex; i<item.episodes.length; i++) item.episodes[i].watched = false;
        }
        
        item.status = item.episodes.every(e => e.watched || (!e.airdate || e.airdate > todayString)) ? 'Watched' : 'In Progress';
        item.last_modified = Date.now();
        saveLocalDB(item.id);
        
        const prog = getProgress(item);
        document.getElementById('modalProgressText').textContent = `${prog}%`;
        document.getElementById('modalProgressBar').style.width = `${prog}%`;
        renderEpisodes(item.episodes.filter(e => e.season === parseInt(seasonStr)), true);
    }

    async function quickAdd(mediaId, watched) {
        if (library.some(i => i.id === mediaId)) return;
        let media = globalMediaCache.get(mediaId);
        if(!media) return;
        let episodes = [];
        if (media.type === 'series') {
            try {
                const res = await fetch(`${TVMAZE_API}/shows/${media.apiId}/episodes`);
                const apiEps = await res.json();
                episodes = apiEps.map(apiEp => {
                    const isReleased = apiEp.airdate && apiEp.airdate <= todayString;
                    return {
                        id: apiEp.id, season: apiEp.season, number: apiEp.number, name: apiEp.name,
                        airdate: apiEp.airdate, runtime: apiEp.runtime, watched: watched && isReleased
                    };
                });
            } catch(e) {}
        }
        const entry = { ...media, episodes, status: watched ? 'Watched' : 'In Progress', addedAt: Date.now(), last_modified: Date.now() };
        library.push(entry);
        saveLocalDB(entry.id);
        updateAllCardsUI();
    }
    // --- MISE A JOUR MASSIVE ---
    async function massUpdateLibrary() {
        const btn = document.getElementById('btn-mass-update');
        btn.innerHTML = `<span class="animate-pulse">🔄 Mise à jour en cours (Ne pas quitter)...</span>`;
        btn.disabled = true;
        btn.classList.add('opacity-70');
        
        try {
            for (let i = 0; i < library.length; i++) {
                let item = library[i];
                try {
                    if (item.type === 'series') {
                        const res = await fetch(`${TVMAZE_API}/shows/${item.apiId}?embed=episodes`);
                        const data = await res.json();
                        
                        item.rating = data.rating?.average || item.rating;
                        item.runtime = data.runtime || data.averageRuntime || item.runtime;
                        item.summary = data.summary?.replace(/<[^>]*>/g, '') || item.summary;
                        item.status_production = data.status || item.status_production;
                        item.network = data.network?.name || data.webChannel?.name || item.network;
                        
                        const apiEps = data._embedded?.episodes || [];
                        let newEpsList = [];
                        apiEps.forEach(apiEp => {
                            const existing = (item.episodes || []).find(e => e.id === apiEp.id);
                            const isReleased = apiEp.airdate && apiEp.airdate <= todayString;
                            const watched = isReleased ? (existing ? existing.watched : false) : false;
                            
                            newEpsList.push({ 
                                id: apiEp.id, season: apiEp.season, number: apiEp.number, name: apiEp.name,
                                airdate: apiEp.airdate, runtime: apiEp.runtime, watched: watched 
                            });
                        });
                        item.episodes = newEpsList;
                        item.status = newEpsList.every(e => e.watched || (!e.airdate || e.airdate > todayString)) ? 'Watched' : 'In Progress';
                        item.last_modified = Date.now();
                        
                    } else if (item.type === 'movie') {
                        if (TRAKT_CLIENT_ID && TRAKT_CLIENT_ID !== 'METTRE_VOTRE_CLIENT_ID_TRAKT_ICI') {
                            const res = await fetch(`https://api.trakt.tv/movies/${item.apiId}?extended=full`, {
                                headers: { 'Content-Type': 'application/json', 'trakt-api-version': '2', 'trakt-api-key': TRAKT_CLIENT_ID }
                            });
                            const data = await res.json();
                            if(data.title) {
                                item.rating = data.rating || item.rating;
                                item.runtime = data.runtime || item.runtime;
                                item.summary = data.overview || item.summary;
                                item.last_modified = Date.now();
                            }
                        } else {
                            const res = await fetch(`${OMDB_API}&i=${item.imdbId || item.apiId}&plot=full`);
                            const data = await res.json();
                            if(data.Response === "True") {
                                item.rating = parseFloat(data.imdbRating) || item.rating;
                                item.runtime = parseInt(data.Runtime) || item.runtime;
                                item.summary = data.Plot || item.summary;
                                item.last_modified = Date.now();
                            }
                        }
                    }
                } catch(e) { console.error("Erreur maj", item.title); }
            }
            saveLocalDB();
            renderProfile();
            if(!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
            alert('Mise à jour de la bibliothèque terminée avec succès !');
        } finally {
            btn.innerHTML = `🔄 Mettre à jour (Infos & Épisodes API)`;
            btn.disabled = false;
            btn.classList.remove('opacity-70');
        }
    }
