// ==========================================
// MAIN.JS — Navigation entre onglets + initialisation au chargement (DOMContentLoaded)
// ==========================================

    // --- INITIALISATION ---
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
        
        // On observe seulement si les éléments sont trouvés dans le DOM
        const sSentinel = document.getElementById('searchSentinel');
        if (sSentinel) searchObserver.observe(sSentinel);
    
        const dSentinel = document.getElementById('discoverSentinel');
        if (dSentinel) discoverObserver.observe(dSentinel);
    });
// --- NAVIGATION ---
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
