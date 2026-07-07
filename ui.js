// --- UI & RENDER ---
function createMediaCard(media, isLib = false) {
    globalMediaCache.set(media.id, media);
    const isAnime = media.genres?.includes('Anime') || media.genres?.includes('Animation');
    const bgColorClass = media.type === 'movie' ? 'bg-amber-900/60' : (isAnime ? 'bg-purple-900/60' : 'bg-teal-900/60');
    const typeFlag = media.type === 'movie' ? 'FILM' : (isAnime ? 'ANIME' : 'SÉRIE');
    const typeClass = media.type === 'movie' ? 'bg-amber-600' : (isAnime ? 'bg-purple-600' : 'bg-teal-600');

    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-xl border border-gray-700 overflow-hidden cursor-pointer shadow-sm relative flex flex-col hover:border-gray-500 transition-colors';
    div.onclick = () => isLib ? openLibraryModal(media.id) : openPreviewModal(media);
    
    // ... [Utilise ici ton code complet de innerHTML pour la carte] ...
    return div;
}

function switchTab(name) {
    ['search','discover','calendar','library','profile'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`nav-${t}`).classList.replace('text-teal-400', 'text-gray-400');
    });
    document.getElementById(`tab-${name}`).classList.remove('hidden');
    document.getElementById(`nav-${name}`).classList.replace('text-gray-400', 'text-teal-400');
    
    if (name === 'library') renderLibrary();
    if (name === 'discover') renderDiscoverTab();
    if (name === 'profile') renderProfile();
    if (name === 'calendar') renderCalendarTab();
}

function closeModal() {
    suggestionsObserver.disconnect();
    document.getElementById('mediaModal').classList.add('hidden');
    activeModalMediaIndex = null;
    document.getElementById('modalSuggestionsBlock').classList.add('hidden');
}

// Ajoute ici tes fonctions : renderSearchGrid, renderDiscoverGrid, renderLibrary, 
// renderProfile, openPreviewModal, openLibraryModal, renderEpisodes, buildSeasonTabs, etc.
