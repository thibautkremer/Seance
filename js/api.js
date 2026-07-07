// ==========================================
// API.JS — Appels aux API externes (TVMaze, OMDb) + normalisation des données
// ==========================================

    async function searchMoviesAPI(query) {
        try {
            // 1. Recherche de la liste des films
            const res = await fetch(`${OMDB_API}&s=${encodeURIComponent(query)}&type=movie`);
            const data = await res.json();
            
            if (data.Response !== "True" || !data.Search) return [];
    
            // 2. On récupère les détails (Note + Résumé) pour chaque film trouvé
            // On utilise Promise.all pour charger tous les détails en parallèle
            return await Promise.all(data.Search.map(async (m) => {
                let fullDetails = { Plot: '', imdbRating: '0' }; // Valeurs par défaut
                
                try {
                    // Requête secondaire pour obtenir les détails du film via son ID (imdbID)
                    const detailRes = await fetch(`${OMDB_API}&i=${m.imdbID}&plot=short`);
                    const detailData = await detailRes.json();
                    if (detailData.Response === "True") {
                        fullDetails = detailData;
                    }
                } catch(e) {
                    console.warn(`Impossible de récupérer les détails pour ${m.Title}`);
                }
    
                return {
                    id: `movie-${m.imdbID}`, 
                    apiId: m.imdbID, 
                    title: m.Title, 
                    type: 'movie', 
                    image: m.Poster !== 'N/A' ? m.Poster : '', 
                    rating: parseFloat(fullDetails.imdbRating) || 0, // Conversion de la note en nombre
                    genres: [], 
                    premiered: m.Year, 
                    runtime: 120, // Valeur standard si non dispo
                    summary: fullDetails.Plot !== 'N/A' ? fullDetails.Plot : '' // La description récupérée
                };
            }));
    
        } catch(e) {
            console.error("Erreur recherche OMDB enrichie:", e);
            return [];
        }
    }
    // --- DECOUVERTE ---
    async function ensureShowsPool() {
        if (showsCache.length > 0) return;
        const res = await fetch(`${TVMAZE_API}/shows?page=0`);
        showsCache = await res.json();
    }
    async function preloadShowsCache() { await ensureShowsPool(); }
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
