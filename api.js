async function searchMoviesAPI(query) {
    try {
        const res = await fetch(`${OMDB_API}&s=${encodeURIComponent(query)}&type=movie`);
        const data = await res.json();
        if (data.Response !== "True" || !data.Search) return [];

        return await Promise.all(data.Search.map(async (m) => {
            let fullDetails = { Plot: '', imdbRating: '0' };
            try {
                const detailRes = await fetch(`${OMDB_API}&i=${m.imdbID}&plot=short`);
                const detailData = await detailRes.json();
                if (detailData.Response === "True") fullDetails = detailData;
            } catch(e) {}
            return {
                id: `movie-${m.imdbID}`, apiId: m.imdbID, title: m.Title, type: 'movie', 
                image: m.Poster !== 'N/A' ? m.Poster : '', rating: parseFloat(fullDetails.imdbRating) || 0,
                genres: [], premiered: m.Year, runtime: 120, summary: fullDetails.Plot !== 'N/A' ? fullDetails.Plot : ''
            };
        }));
    } catch(e) { return []; }
}

async function ensureShowsPool() {
    if (showsCache.length > 0) return;
    const res = await fetch(`${TVMAZE_API}/shows?page=0`);
    showsCache = await res.json();
}

function initSupabase() {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        forceSync();
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') processSyncQueue(); });
    } catch(e) {}
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
            data.forEach(cloudRow => {
                const localIdx = library.findIndex(x => x.id === cloudRow.media_id);
                if (localIdx === -1) { library.push(cloudRow.media_data); } 
                else if ((cloudRow.last_modified||0) > (library[localIdx].last_modified||0)) { library[localIdx] = cloudRow.media_data; }
            });
            deduplicateLibrary(); saveLocalDB(); renderLibrary(); renderProfile();
        }
        processSyncQueue();
    } catch(e) { setCloudStatus('offline'); }
}
