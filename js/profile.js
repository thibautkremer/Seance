// ==========================================
// PROFILE.JS — Affichage de l'onglet Profil
// ==========================================

function renderProfile() {
    // Rend le panneau des statistiques principales
    if (typeof renderAdvancedStatsPanel === 'function') {
        const statsPanel = document.getElementById('advancedStatsPanel');
        if (statsPanel) {
            statsPanel.innerHTML = renderAdvancedStatsPanel();
        }
    }

    // Rend les réglages de notification (situé dans le menu déroulant)
    if (typeof renderNotificationSettings === 'function') {
        renderNotificationSettings();
    }
}
