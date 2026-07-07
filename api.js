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
