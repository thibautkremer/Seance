// ==========================================
// SUGGESTIONS.JS — Suggestions dans la modale
// ==========================================

    // --- MODULE DE SUGGESTIONS ---
    async function renderSuggestions(genre, currentId) {
        const block = document.getElementById('modalSuggestionsBlock');
        block.classList.remove('hidden');
        block.innerHTML = `
            <div id="modalSuggestionsList" class="space-y-2"></div>
            <div id="modalSuggestionsSentinel" class="h-4"></div>
        `;
        
        try {
            await ensureShowsPool();
            modalSuggestionsPool = showsCache.filter(s => s.genres?.includes(genre) && `series-${s.id}` !== currentId).sort(() => 0.5 - Math.random());
            modalSuggestionsPage = 1;
            
            // On nettoie l'ancien observer s'il y en avait un
            suggestionsObserver.disconnect();
            
            // On cible le sentinel fraîchement créé et on l'observe
            const sent = document.getElementById('modalSuggestionsSentinel');
            if (sent) suggestionsObserver.observe(sent);
            
            // On affiche la première page de suggestions
            appendSuggestions(true);
        } catch(e) {
            console.error("Erreur lors du chargement des suggestions", e);
        }
    }

    function appendSuggestions(clear = false) {
        const list = document.getElementById('modalSuggestionsList');
        if(clear) list.innerHTML = '';
        
        const start = (modalSuggestionsPage - 1) * 8; 
        const end = start + 8;
        const slice = modalSuggestionsPool.slice(start, end);
        
        if(slice.length === 0 && clear) {
            list.innerHTML = `<div class="text-xs text-gray-500 py-2 text-center">Aucune suggestion trouvée.</div>`;
            return;
        }

        slice.forEach(show => {
            const n = normalizeShow(show);
            const rate = n.rating > 0 ? n.rating.toFixed(1) : 'N/A';
            const div = document.createElement('div');
            div.className = 'bg-gray-900 border border-gray-700 p-2 rounded-xl flex gap-3 items-center';
            div.innerHTML = `
                <img src="${n.image || 'https://placehold.co/40x60'}" class="w-12 h-16 object-cover rounded cursor-pointer shrink-0 border border-gray-800" onclick='closeModal(); openPreviewModal(${JSON.stringify(n).replace(/'/g, "&#39;")})' />
                <div class="flex-1 min-w-0 cursor-pointer" onclick='closeModal(); openPreviewModal(${JSON.stringify(n).replace(/'/g, "&#39;")})'>
                    <h4 class="text-xs font-bold text-white truncate">${n.title}</h4>
                    <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-[9px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">${n.premiered}</span>
                        <span class="text-[9px] text-yellow-400 font-bold ml-1 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50">★ ${rate}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-1 w-20 shrink-0" id="actions-${n.id}">${buildCardActionsHTML(n.id)}</div>
            `;
            list.appendChild(div);
        });
    }
