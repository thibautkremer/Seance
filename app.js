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

// Ajoute ici : saveLocalDB, initSupabase, forceSync, deduplicateLibrary, etc.
