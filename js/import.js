// ==========================================
// IMPORT.JS — Import JSON + réinitialisation du cache local
// ==========================================

    async function importLibrary(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                for(let raw of data) {
                    const existingIdx = library.findIndex(x => x.id === raw.id || x.title === raw.title);
                    if(existingIdx !== -1) {
                        library[existingIdx] = {...library[existingIdx], ...raw, last_modified: Date.now()};
                        queueForSync(library[existingIdx].id);
                    } else {
                        library.push({...raw, last_modified: Date.now()});
                        queueForSync(raw.id || `custom-${Date.now()}`);
                    }
                }
                saveLocalDB();
                renderProfile();
                alert("Import terminé avec succès.");
            } catch(err) { alert('Erreur JSON. Vérifiez le format.'); }
        };
        reader.readAsText(file);
    }

    function clearAll() {
        if (!confirm('Vider le cache local ? Vos données Cloud ne seront pas supprimées mais votre vue locale sera réinitialisée.')) return;
        library = []; localStorage.removeItem('personal_tracker_db'); renderLibrary(); renderProfile();
    }
