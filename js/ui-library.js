// ==========================================
// UI-LIBRARY.JS — Gestion de l'affichage des suivis
// ==========================================

function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;

    // Récupération sécurisée des valeurs des filtres
    const typeFilter = document.getElementById('filterLibType')?.value || 'all';
    const statusFilter = document.getElementById('filterLibStatus')?.value || 'all';
    const broadcastFilter = document.getElementById('filterLibBroadcast')?.value || 'all';
    
    let filtered = library.filter(m => {
        // Filtrage du Type
        if (typeFilter === 'anime') {
            if (m.type !== 'series' || !(m.genres || []).includes('Anime')) return false;
        } else if (typeFilter === 'series') {
            if (m.type !== 'series' || (m.genres || []).includes('Anime')) return false;
        } else if (typeFilter !== 'all' && m.type !== typeFilter) {
            return false;
        }
        
        // Filtrage de la Progression
        if (statusFilter !== 'all' && m.status !== statusFilter) return false;
        
        // Filtrage de la Diffusion (Séries uniquement)
        if (broadcastFilter !== 'all') {
            if (m.type === 'movie') return false; 
            if (m.status_production !== broadcastFilter) return false;
        }
        return true;
    });

    // Appliquer les filtres avancés s'ils existent et sont actifs
    if (typeof advancedFilterEngine !== 'undefined') {
        filtered = advancedFilterEngine.applyFilters(filtered);
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-12">Aucun média ne correspond à ces critères.</div>`;
        return;
    }

    filtered.forEach(item => {
        const isAnime = item.type === 'series' && (item.genres || []).includes('Anime');
        const typeLabel = isAnime ? 'Anime' : (item.type === 'series' ? 'Série' : 'Film');
        const typeColor = item.type === 'movie' ? 'bg-amber-600' : (isAnime ? 'bg-purple-600' : 'bg-teal-600');
        
        // Gestion de la barre de progression
        let progressHtml = '';
        if (item.type === 'series' && item.episodes && item.episodes.length > 0) {
            const watched = item.episodes.filter(e => e.watched).length;
            const total = item.episodes.length;
            const percent = Math.round((watched / total) * 100);
            progressHtml = `
                <div class="mt-2 h-1.5 w-full bg-gray-700 rounded overflow-hidden">
                    <div class="h-full ${percent === 100 ? 'bg-emerald-500' : 'bg-teal-500'}" style="width: ${percent}%"></div>
                </div>
                <div class="text-[9px] text-gray-400 text-right mt-0.5">${watched}/${total} ép.</div>
            `;
        } else if (item.status === 'Watched') {
            progressHtml = `<div class="mt-2 text-[10px] font-bold text-emerald-500 text-right">✓ Terminé</div>`;
        }

        grid.innerHTML += `
            <div onclick="openLibraryModal('${item.id}')" class="relative bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-teal-500 transition shadow-lg group flex flex-col">
                <div class="relative w-full aspect-[2/3]">
                    <img src="${item.image || 'https://via.placeholder.com/300x450?text=Pas+d+image'}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                    <div class="absolute top-2 left-2 ${typeColor} text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow">${typeLabel}</div>
                </div>
                <div class="p-2 flex-1 flex flex-col justify-between">
                    <h3 class="text-xs font-bold text-white line-clamp-1">${item.title}</h3>
                    ${progressHtml}
                </div>
            </div>
        `;
    });
}
