// --- INITIALISATION ---
window.addEventListener('DOMContentLoaded', () => {
    deduplicateLibrary();
    initSupabase();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const q = e.target.value.trim();
            if (q.length > 1) triggerFuzzySearch(q);
        });
    }

    updateHeaderCount();
    preloadShowsCache();
    
    const sSentinel = document.getElementById('searchSentinel');
    if (sSentinel) searchObserver.observe(sSentinel);

    const dSentinel = document.getElementById('discoverSentinel');
    if (dSentinel) discoverObserver.observe(dSentinel);
});

// --- GESTION DE LA BASE LOCALE ---
function deduplicateLibrary() {
    const unique = [];
    const seen = new Set();
    library.sort((a,b) => (b.last_modified || 0) - (a.last_modified || 0));
    for(const item of library) {
        if(item && item.id && item.title && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
        }
    }
    library = unique;
}

function saveLocalDB(mediaId = null) {
    try {
        localStorage.setItem('personal_tracker_db', JSON.stringify(library));
        updateHeaderCount();
        if (mediaId) queueForSync(mediaId);
    } catch (e) {
        console.error("Erreur de sauvegarde locale. Quota dépassé ?");
        alert("Erreur critique : Espace de stockage saturé. Veuillez vider le cache ou lancer une mise à jour massive pour purger la base.");
    }
}

function updateHeaderCount() {
    const el = document.getElementById('libCount');
    if(library.length > 0) { el.textContent = library.length; el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
}

// --- SYNCHRO SUPABASE ---
function initSupabase() {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        forceSync();
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') processSyncQueue(); });
    } catch(e) {}
}

function setCloudStatus(status) {
    const el = document.getElementById('cloudStatus');
    if (status === 'syncing') el.innerHTML = 'Sync...';
    else if (status === 'offline') el.innerHTML = 'Hors-ligne';
    else el.innerHTML = '✓ Synchro OK';
}

function queueForSync(mediaId) {
    if (!syncQueue.includes(mediaId)) syncQueue.push(mediaId);
    try {
        localStorage.setItem('personal_tracker_sync_queue', JSON.stringify(syncQueue));
        processSyncQueue();
    } catch (e) { console.error("Impossible de sauvegarder la file d'attente (Quota)"); }
}

async function processSyncQueue() {
    if (!supabaseClient || syncQueue.length === 0) return;
    setCloudStatus('syncing');
    for (let i = syncQueue.length - 1; i >= 0; i--) {
        const id = syncQueue[i];
        const item = library.find(x => x.id === id);
        try {
            if (item) await supabaseClient.from('user_library').upsert({ user_id: localUserId, media_id: id, media_data: item, last_modified: item.last_modified }, { onConflict: 'user_id, media_id' });
            else await supabaseClient.from('user_library').delete().match({ user_id: localUserId, media_id: id });
            syncQueue.splice(i, 1);
        } catch (e) {}
    }
    localStorage.setItem('personal_tracker_sync_queue', JSON.stringify(syncQueue));
    setCloudStatus('online');
}

async function forceSync() {
    if (!supabaseClient) return;
    setCloudStatus('syncing');
    try {
        const { data, error } = await supabaseClient.from('user_library').select('*').eq('user_id', localUserId);
        if(error) throw error;
        
        if (data && data.length > 0) {
            let localUpdated = false;
            data.forEach(cloudRow => {
                const localIdx = library.findIndex(x => x.id === cloudRow.media_id);
                if (localIdx === -1) { 
                    library.push(cloudRow.media_data); 
                    localUpdated = true; 
                } else if ((cloudRow.last_modified||0) > (library[localIdx].last_modified||0)) { 
                    library[localIdx] = cloudRow.media_data; 
                    localUpdated = true; 
                }
            });
            if (localUpdated) { 
                deduplicateLibrary(); 
                saveLocalDB(); 
                if(!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
                if(!document.getElementById('tab-profile').classList.contains('hidden')) renderProfile();
            }
        }
        processSyncQueue();
    } catch(e) { setCloudStatus('offline'); }
}

// --- LOGIQUE METIER & ACTIONS ---
async function triggerFuzzySearch(query) {
    await ensureShowsPool(); 
    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    try {
        const [movieRes, tvmazeRes] = await Promise.all([
            searchMoviesAPI(query),
            fetch(`${TVMAZE_API}/search/shows?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(()=>[])
        ]);
        
        let results = [...movieRes];
        if (Array.isArray(tvmazeRes)) results = results.concat(tvmazeRes.map(i => normalizeShow(i.show)));
        
        const localMatches = showsCache.filter(s => qWords.every(w => s.name.toLowerCase().includes(w))).map(normalizeShow);
        
        results = [...results, ...localMatches].filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i).slice(0, 50);
        
        results.forEach(m => globalMediaCache.set(m.id, m));
        searchResults = results;
        resetAndDisplaySearch();
    } catch(e) {}
}

function resetAndDisplaySearch() { searchPage = 1; renderSearchGrid(true); }

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

function handleRemove(mediaId) {
    library = library.filter(i => i.id !== mediaId);
    saveLocalDB(mediaId);
    updateAllCardsUI();
    if (!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
}

async function handleQuickAdd(container, mediaId, watched) {
    container.innerHTML = `<span class="text-[9px] text-teal-400 py-1 font-bold animate-pulse w-full text-center">Ajout...</span>`;
    await quickAdd(mediaId, watched);
}

function normalizeShow(show) {
    const obj = {
        id: `series-${show.id}`, apiId: show.id, title: show.name, type: 'series',
        image: show.image?.medium || '', summary: show.summary?.replace(/<[^>]*>/g, '') || '',
        rating: show.rating?.average || 0, genres: show.genres || [], status_production: show.status || 'Running',
        premiered: show.premiered ? show.premiered.split('-')[0] : 'N/A',
        runtime: show.runtime || show.averageRuntime || 0,
        network: show.network?.name || show.webChannel?.name || 'Inconnu'
    };
    globalMediaCache.set(obj.id, obj);
    return obj;
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

// --- IMPORT / EXPORT ---
async function importLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            for(let raw of data) {
                const existingIdx = library.findIndex(x => x.id === raw.id || x.title === raw.title);
                if(existingIdx !== -1) {
                    library[existingIdx] = {...library[existingIdx], ...raw, last_modified: Date.now()};
                    queueForSync(library[existingIdx].id);
                } else {
                    library.push({...raw, last_modified: Date.now()});
                    queueForSync(raw.id || `custom-${Date.now()}`);
                }
            }
            saveLocalDB();
            renderProfile();
            alert("Import terminé avec succès.");
        } catch(err) { alert('Erreur JSON. Vérifiez le format.'); }
    };
    reader.readAsText(file);
}

function clearAll() {
    if (!confirm('Vider le cache local ? Vos données Cloud ne seront pas supprimées mais votre vue locale sera réinitialisée.')) return;
    library = []; localStorage.removeItem('personal_tracker_db'); renderLibrary(); renderProfile();
}
