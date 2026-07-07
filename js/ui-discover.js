// ==========================================
// UI-DISCOVER.JS — Onglet Découverte (mix/top/trending)
// ==========================================

    function setDiscoverType(type) {
        discoverMediaType = type;
        document.getElementById('btn-disc-type-series').className = type === 'series' ? 'px-3 py-1 text-[10px] font-bold rounded shadow bg-teal-600 text-white transition' : 'px-3 py-1 text-[10px] font-bold rounded text-gray-400 hover:text-white transition';
        document.getElementById('btn-disc-type-movie').className = type === 'movie' ? 'px-3 py-1 text-[10px] font-bold rounded shadow bg-teal-600 text-white transition' : 'px-3 py-1 text-[10px] font-bold rounded text-gray-400 hover:text-white transition';
        discoverPage = 1;
        renderDiscoverTab(true);
    }

    function setDiscoverMode(mode) {
        currentDiscoverMode = mode;
        ['mix', 'top', 'trending'].forEach(m => {
            const btn = document.getElementById(`btn-disc-${m}`);
            if(m === mode) btn.className = "py-1.5 text-xs font-bold rounded bg-teal-600 text-white shadow";
            else btn.className = "py-1.5 text-xs font-bold rounded bg-gray-700 text-gray-300";
        });
        discoverPage = 1;
        renderDiscoverTab(true);
    }

    async function renderDiscoverTab(force = false) {
    if (!force && discoverResults.length > 0 && document.getElementById('discoverGrid').children.length > 0) return;
    const libIds = new Set(library.map(i => i.id));
    
    if (discoverMediaType === 'series') {
        await ensureShowsPool();
        let pool = showsCache.filter(s => !libIds.has(`series-${s.id}`));
        
        if(currentDiscoverMode === 'mix') {
            const favoriteKeywords = ['Anime', 'Animation', 'Action', 'Fantasy'];
            let personalized = pool.filter(s => s.genres?.some(g => favoriteKeywords.includes(g)));
            if(personalized.length < 50) personalized = [...personalized, ...pool];
            discoverResults = personalized.sort(() => 0.5 - Math.random()).slice(0, 100).map(normalizeShow);
        } 
        else if (currentDiscoverMode === 'top') {
            discoverResults = pool.filter(s => s.rating?.average > 0).sort((a,b) => b.rating.average - a.rating.average).slice(0, 100).map(normalizeShow);
        }
        else if (currentDiscoverMode === 'trending') {
            discoverResults = pool.filter(s => s.status === 'Running' && s.rating?.average > 0).sort((a,b) => b.updated - a.updated).slice(0, 100).map(normalizeShow);
        }
    } else {
        // --- NOUVELLE LOGIQUE : Découverte de films via OMDB (Robuste) ---
        // On simule une "Découverte" en cherchant des mots-clés populaires
        const categories = ['2026', 'action', 'sci-fi', 'animation', 'comedy', 'adventure'];
        let moviePool = [];
        
        for (let cat of categories) {
            try {
                const results = await searchMoviesAPI(cat);
                moviePool = moviePool.concat(results);
            } catch (e) { continue; }
        }
        
        // On supprime les doublons (si un film apparaît dans plusieurs catégories)
        discoverResults = [...new Map(moviePool.map(item => [item.id, item])).values()]
            .filter(v => !libIds.has(v.id))
            .sort(() => 0.5 - Math.random());
    }
    
    discoverResults.forEach(m => globalMediaCache.set(m.id, m));
    discoverPage = 1;
    renderDiscoverGrid(true);
}


    function renderDiscoverGrid(clear = false) {
        const container = document.getElementById('discoverGrid');
        if(clear) container.innerHTML = '';
        
        const start = (discoverPage - 1) * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, MAX_RESULTS);
        discoverResults.slice(start, end).forEach(m => container.appendChild(createMediaCard(m, false)));
    }
