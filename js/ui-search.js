// ==========================================
// UI-SEARCH.JS — Onglet Recherche (type de média, grille de résultats)
// ==========================================

    function setMediaType(type) {
        currentMediaType = type;
        document.getElementById('btn-series').className = type === 'series' ? 'py-2 text-sm font-bold rounded-lg bg-teal-600 text-white' : 'py-2 text-sm font-bold rounded-lg text-gray-400';
        document.getElementById('btn-movie').className = type === 'movie' ? 'py-2 text-sm font-bold rounded-lg bg-teal-600 text-white' : 'py-2 text-sm font-bold rounded-lg text-gray-400';
        resetAndDisplaySearch();
    }
    function resetAndDisplaySearch() { searchPage = 1; renderSearchGrid(true); }

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
        const slice = filtered.slice(start, end);
        slice.forEach(m => container.appendChild(createMediaCard(m, false)));
    }
