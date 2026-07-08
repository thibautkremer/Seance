// ==========================================
// MAIN.JS — Routage principal et initialisation
// ==========================================

function switchTab(tabId) {
    // 1. Cacher tous les onglets et réinitialiser les couleurs de navigation
    ['search', 'discover', 'calendar', 'library', 'profile'].forEach(id => {
        const el = document.getElementById(`tab-${id}`);
        if (el) el.classList.add('hidden');
        
        const nav = document.getElementById(`nav-${id}`);
        if (nav) {
            nav.classList.remove('text-teal-400');
            nav.classList.add('text-gray-400');
        }
    });

    // 2. Afficher l'onglet sélectionné
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) {
        targetNav.classList.remove('text-gray-400');
        targetNav.classList.add('text-teal-400');
    }

    // 3. Exécuter la fonction de rendu appropriée à l'onglet
    try {
        if (tabId === 'library' && typeof renderLibrary === 'function') renderLibrary();
        if (tabId === 'calendar' && typeof renderCalendarTab === 'function') renderCalendarTab();
        if (tabId === 'profile' && typeof renderProfile === 'function') renderProfile();
        if (tabId === 'discover' && typeof renderDiscoverGrid === 'function' && discoverResults.length === 0) {
            renderDiscoverGrid(true);
        }
    } catch (e) {
        console.error(`Erreur lors du rendu de l'onglet ${tabId} :`, e);
    }
}

// Initialisation au lancement de l'application
document.addEventListener('DOMContentLoaded', () => {
    switchTab('search');
    if (typeof updateHeaderCount === 'function') {
        updateHeaderCount();
    }
});
