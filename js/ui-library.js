// ==========================================
// UI-LIBRARY.JS — Bibliothèque personnelle + cartes médias
// ==========================================

    // --- BIBLIOTHEQUE ---
    function applySmartFilter(keyword) {
        if(keyword === 'movie') { document.getElementById('libraryTypeFilter').value = 'movie'; document.getElementById('librarySearch').value = ''; }
        else { document.getElementById('libraryTypeFilter').value = 'all'; document.getElementById('librarySearch').value = keyword; }
        renderLibrary();
    }

    function renderLibrary() {
        const grid = document.getElementById('libraryGrid');
        const sFilter = document.getElementById('libraryStatusFilter').value;
        const dFilter = document.getElementById('libraryDiffusionFilter').value;
        const tFilter = document.getElementById('libraryTypeFilter').value;
        const searchInput = document.getElementById('librarySearch').value.toLowerCase().trim();
        
        grid.innerHTML = '';
        
        library.filter(item => {
            if(!item || !item.id) return false; 
            if (tFilter !== 'all' && item.type !== tFilter) return false;
            if (sFilter === 'not_finished' && item.status !== 'In Progress') return false;
            if (sFilter === 'watched' && item.status !== 'Watched') return false;
            if (sFilter === 'abandoned' && item.status !== 'Abandoned') return false;
            
            if (item.type === 'series' && dFilter !== 'all') {
                const sp = (item.status_production || '').toLowerCase();
                const isManualCanceled = item.user_forced_cancel === true;
                if (dFilter === 'canceled' && !isManualCanceled && !sp.includes('cancel')) return false;
                if (dFilter === 'running' && (isManualCanceled || !sp.includes('running'))) return false;
                if (dFilter === 'ended' && (isManualCanceled || !sp.includes('ended'))) return false;
            }
            
            if (searchInput !== "") {
                const titleMatch = item.title ? item.title.toLowerCase().includes(searchInput) : false;
                const genreMatch = item.genres ? item.genres.some(g => g.toLowerCase().includes(searchInput)) : false;
                const networkMatch = item.network ? item.network.toLowerCase().includes(searchInput) : false;
                if (!titleMatch && !genreMatch && !networkMatch) return false;
            }
            return true;
        }).forEach((item) => { grid.appendChild(createMediaCard(item, true)); });
    }

    function getProgress(item) {
        if (!item.episodes || item.episodes.length === 0) return item.status === 'Watched' ? 100 : 0;
        const watched = item.episodes.filter(e => e.watched).length;
        return Math.round((watched / item.episodes.length) * 100);
    }

    // --- CARTES MEDIAS ---
    function buildCardActionsHTML(mediaId) {
        const inLib = library.some(i => i.id === mediaId);
        if (inLib) return `<button onclick="event.stopPropagation(); handleRemove('${mediaId}')" class="w-full text-center text-[9px] bg-gray-900 hover:bg-red-950 text-gray-500 hover:text-red-400 border border-gray-700 py-1 rounded">✕ Retirer</button>`;
        return `<button onclick="event.stopPropagation(); handleQuickAdd(this.parentElement, '${mediaId}', false)" class="flex-1 text-[9px] bg-teal-600 text-white font-bold py-1 rounded">+ Voir</button>
                <button onclick="event.stopPropagation(); handleQuickAdd(this.parentElement, '${mediaId}', true)" class="flex-1 text-[9px] bg-emerald-700 text-white font-bold py-1 rounded">✓ Vu</button>`;
    }
    
    function updateAllCardsUI() {
        document.querySelectorAll('[id^="actions-"]').forEach(el => {
            const id = el.id.replace('actions-', '');
            el.innerHTML = buildCardActionsHTML(id);
        });
    }

    async function handleQuickAdd(container, mediaId, watched) {
        container.innerHTML = `<span class="text-[9px] text-teal-400 py-1 font-bold animate-pulse w-full text-center">Ajout...</span>`;
        await quickAdd(mediaId, watched);
    }
    
    function handleRemove(mediaId) {
        library = library.filter(i => i.id !== mediaId);
        saveLocalDB(mediaId);
        updateAllCardsUI();
        if (!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
    }

    function createMediaCard(media, isLib = false) {
        globalMediaCache.set(media.id, media);
        const isAnime = media.genres?.includes('Anime') || media.genres?.includes('Animation');
        
        const bgColorClass = media.type === 'movie' ? 'bg-amber-900/60' : (isAnime ? 'bg-purple-900/60' : 'bg-teal-900/60');
        const typeFlag = media.type === 'movie' ? 'FILM' : (isAnime ? 'ANIME' : 'SÉRIE');
        const typeClass = media.type === 'movie' ? 'bg-amber-600' : (isAnime ? 'bg-purple-600' : 'bg-teal-600');

        const div = document.createElement('div');
        div.className = 'bg-gray-800 rounded-xl border border-gray-700 overflow-hidden cursor-pointer shadow-sm relative flex flex-col hover:border-gray-500 transition-colors';
        div.onclick = () => isLib ? openLibraryModal(media.id) : openPreviewModal(media);
        
        const quickActions = !isLib ? `<div class="mt-auto flex gap-1 pt-1" id="actions-${media.id}">${buildCardActionsHTML(media.id)}</div>` : '';
        const rating = media.rating > 0 ? media.rating.toFixed(1) : 'N/A';
        const ratingOverlay = `<div class="absolute top-1 right-1 bg-black/80 text-yellow-400 text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow border border-gray-800/50">★ ${rating}</div>`;
        const dateOverlay = !isLib && media.premiered ? `<div class="absolute bottom-1 right-1 bg-black/80 text-gray-300 text-[9px] font-black px-1.5 py-0.5 rounded z-10 border border-gray-800/50">${media.premiered}</div>` : '';

        let libOverlay = '';
        let libProgress = '';
        if (isLib && media.type === 'series') {
            const prog = getProgress(media);
            const nextEp = media.episodes?.find(e => !e.watched && e.airdate && e.airdate <= todayString);
            if (media.status === 'Watched') {
                libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-amber-900 border border-gray-700 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Non vu</button>`;
            } else if (media.status === 'Abandoned') {
                libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-red-900 border border-red-700 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Reprendre</button>`;
            } else if (nextEp) {
                libOverlay = `<button onclick="event.stopPropagation(); checkNextEp('${media.id}')" class="absolute bottom-1 right-1 bg-teal-600/90 hover:bg-teal-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">✓ S${nextEp.season}E${nextEp.number}</button>`;
            }
            libProgress = `<div class="absolute bottom-0 inset-x-0 h-1.5 bg-gray-700/80 z-10"><div class="h-full bg-teal-500" style="width:${prog}%"></div></div>`;
        } else if (isLib && media.type === 'movie' && media.status === 'Watched') {
            libOverlay = `<button onclick="event.stopPropagation(); resetToUnwatched('${media.id}')" class="absolute bottom-1 right-1 bg-gray-900/90 hover:bg-amber-900 border border-gray-700 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black transition shadow z-20">↺ Non vu</button>`;
        }

        const badgeHTML = !isLib ? `<span class="absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded ${typeClass} text-white z-10 shadow">${typeFlag}</span>` : '';
        const titleBg = isLib ? bgColorClass : 'bg-gray-800';

        div.innerHTML = `
            <div class="relative w-full">
                <img src="${media.image || 'https://placehold.co/155x217/1f2937/4b5563'}" class="media-poster bg-gray-900" loading="lazy" />
                ${badgeHTML}
                ${ratingOverlay}
                ${dateOverlay}
                ${libOverlay}
                ${libProgress}
            </div>
            <div class="p-2 flex-1 flex flex-col ${titleBg}">
                <h3 class="font-bold text-white text-[11px] truncate leading-tight">${media.title || 'Inconnu'}</h3>
                ${quickActions}
            </div>
        `;
        return div;
    }

    function checkNextEp(id) {
        const item = library.find(i => i.id === id);
        if(!item) return;
        const nextEp = item.episodes?.find(e => !e.watched && e.airdate && e.airdate <= todayString);
        if(nextEp) {
            const idx = item.episodes.indexOf(nextEp);
            for(let i=0; i<=idx; i++) item.episodes[i].watched = true; 
            item.status = item.episodes.every(e => e.watched || !e.airdate || e.airdate > todayString) ? 'Watched' : 'In Progress';
            item.last_modified = Date.now();
            saveLocalDB(item.id);
            renderLibrary();
        }
    }
    
    function resetToUnwatched(id) {
        const item = library.find(i => i.id === id);
        if(!item) return;
        if(item.type === 'series') item.episodes?.forEach(e => e.watched = false);
        item.status = 'In Progress';
        item.last_modified = Date.now();
        saveLocalDB(item.id);
        renderLibrary();
    }
