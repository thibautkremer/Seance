// ==========================================
// UI-SEARCH.JS — Gestion de la recherche et de l'affichage des résultats
// ==========================================

function setMediaType(type) {
    currentMediaType = type;
    
    const btnSeries = document.getElementById('btn-series');
    const btnMovie = document.getElementById('btn-movie');
    
    if (btnSeries) {
        btnSeries.className = type === 'series' ? 'py-2 text-sm font-bold rounded-lg bg-teal-600 text-white shadow' : 'py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition';
    }
    if (btnMovie) {
        btnMovie.className = type === 'movie' ? 'py-2 text-sm font-bold rounded-lg bg-teal-600 text-white shadow' : 'py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition';
    }
    
    resetAndDisplaySearch();
}

function resetAndDisplaySearch() {
    searchPage = 1;
    const grid = document.getElementById('searchResults');
    if (grid) grid.innerHTML = '';
    renderSearchGrid(true);
}

function renderSearchGrid(isReset = false) {
    const grid = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (!grid) return;
    
    // Protection absolue contre le null
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Si c'est un reset complet
    if (isReset) grid.innerHTML = '';

    // On filtre d'abord le type actuel
    let filteredResults = searchResults.filter(r => r.type === currentMediaType);
    
    if (query) {
        // Filtrage basique si une recherche texte est présente
        filteredResults = filteredResults.filter(r => (r.title || '').toLowerCase().includes(query));
    }

    // Pagination
    const start = (searchPage - 1) * PAGE_SIZE;
    const end = searchPage * PAGE_SIZE;
    const toRender = filteredResults.slice(start, end);

    if (toRender.length === 0 && searchPage === 1) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">Recherchez un film ou une série pour commencer.</div>`;
        return;
    }

    toRender.forEach(item => {
        const isAdded = library.some(l => l.id === item.id);
        const isAnime = item.type === 'series' && (item.genres || []).includes('Anime');
        const typeColor = item.type === 'movie' ? 'bg-amber-600' : (isAnime ? 'bg-purple-600' : 'bg-teal-600');
        const typeLabel = isAnime ? 'Anime' : (item.type === 'series' ? 'Série' : 'Film');
        const badge = isAdded 
            ? `<div class="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">✓ Ajouté</div>`
            : '';

        grid.innerHTML += `
            <div onclick="openPreviewModal('${item.id}')" class="relative bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-teal-500 transition shadow-lg group">
                <div class="relative w-full aspect-[2/3]">
                    <img src="${item.image || 'https://via.placeholder.com/300x450?text=Pas+d+image'}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                    <div class="absolute top-2 left-2 ${typeColor} text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow">${typeLabel}</div>
                    ${badge}
                </div>
                <div class="p-2">
                    <h3 class="text-xs font-bold text-white line-clamp-1">${item.title}</h3>
                    <div class="text-[10px] text-gray-400 mt-1 flex justify-between">
                        <span>⭐ ${item.rating || 'N/A'}</span>
                        <span>${item.premiered ? item.premiered.substring(0,4) : ''}</span>
                    </div>
                </div>
            </div>
        `;
    });

    // Observer pour le scroll infini
    if (end < filteredResults.length && typeof searchObserver !== 'undefined') {
        const dummy = document.createElement('div');
        dummy.className = 'col-span-full h-4';
        grid.appendChild(dummy);
        searchObserver.observe(dummy);
    }
}

// Écouteur sur l'input de recherche
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const val = e.target.value.trim();
                if (val.length > 2) {
                    if (typeof triggerFuzzySearch === 'function') triggerFuzzySearch(val);
                } else if (val.length === 0) {
                    resetAndDisplaySearch();
                }
            }, 500);
        });
    }
});
