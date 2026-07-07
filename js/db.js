// ==========================================
// DB.JS — Gestion de la base locale (localStorage)
// ==========================================

    // --- GESTION DE LA BASE LOCALE ---
    function deduplicateLibrary() {
        const unique = [];
        const seen = new Set();
        library.sort((a,b) => (b.last_modified || 0) - (a.last_modified || 0));
        for(const item of library) {
            if(item && item.id && item.title && !seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
            }
        }
        library = unique;
    }

    function saveLocalDB(mediaId = null) {
        try {
            localStorage.setItem('personal_tracker_db', JSON.stringify(library));
            updateHeaderCount();
            if (mediaId) queueForSync(mediaId);
        } catch (e) {
            console.error("Erreur de sauvegarde locale. Quota dépassé ?");
            alert("Erreur critique : Espace de stockage saturé. Veuillez vider le cache ou lancer une mise à jour massive pour purger la base.");
        }
    }

    function updateHeaderCount() {
        const el = document.getElementById('libCount');
        if(library.length > 0) { el.textContent = library.length; el.classList.remove('hidden'); }
        else { el.classList.add('hidden'); }
    }
