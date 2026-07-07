// ==========================================
// CALENDAR.JS — Onglet Calendrier (prochaines sorties/épisodes)
// ==========================================

    // --- CALENDRIER ---
    function setCalFilter(f) {
        calFilter = f;
        ['all','today','week','month'].forEach(id => {
            const btn = document.getElementById(`cal-${id}`);
            if (btn) btn.className = id === f ? 'shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold bg-teal-600 text-white' : 'shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold bg-gray-800 text-gray-400 border border-gray-700';
        });
        renderCalendarTab();
    }

    function renderCalendarTab() {
        const container = document.getElementById('calendarTimeline');
        container.innerHTML = '';
        const today = new Date(); today.setHours(0,0,0,0);
        let futureEps = [];

        library.forEach(item => {
            if (item.type === 'movie') {
                if (item.premiered && item.premiered.length >= 4 && item.premiered >= todayString && item.status !== 'Watched') {
                    if (calFilter === 'today' && item.premiered !== todayString) return;
                    futureEps.push({ mediaId: item.id, showTitle: item.title, showImage: item.image, epName: 'SORTIE FILM', season: null, number: null, airdate: item.premiered, type: 'movie' });
                }
            } else {
                (item.episodes||[]).forEach(ep => {
                    if (!ep.airdate || ep.watched || item.status === 'Abandoned') return;
                    if (ep.airdate < todayString) return;
                    if (calFilter === 'today' && ep.airdate !== todayString) return;
                    if (calFilter === 'week') {
                        const epDate = new Date(ep.airdate); epDate.setHours(0,0,0,0);
                        if ((epDate - today) / 86400000 > 7) return;
                    }
                    if (calFilter === 'month') {
                        const epDate = new Date(ep.airdate);
                        if (epDate.getMonth() !== today.getMonth() || epDate.getFullYear() !== today.getFullYear()) return;
                    }
                    futureEps.push({ mediaId: item.id, showTitle: item.title, showImage: item.image, epName: ep.name, season: ep.season, number: ep.number, airdate: ep.airdate, type: 'series' });
                });
            }
        });

        if (!futureEps.length) { container.innerHTML = `<p class="text-xs text-gray-500 text-center py-12">Aucune sortie planifiée.</p>`; return; }
        
        futureEps.sort((a,b) => a.airdate.localeCompare(b.airdate));
        
        const groups = {};
        futureEps.forEach(ep => { if (!groups[ep.airdate]) groups[ep.airdate] = []; groups[ep.airdate].push(ep); });
        
        Object.entries(groups).forEach(([date, eps]) => {
            const diff = Math.ceil((new Date(date) - today) / 86400000);
            const label = diff === 0 ? "Aujourd'hui 🎉" : diff === 1 ? "Demain" : `<span class="text-[#FFD700] font-black drop-shadow-md">J-${diff}</span>`;
            
            container.innerHTML += `<div class="text-[11px] font-black text-teal-400 uppercase tracking-wider mt-3 mb-1">${label}</div>`;
            eps.forEach(ep => {
                const subTxt = ep.type === 'movie' ? `<span class="text-amber-500 font-bold bg-amber-900/30 px-1 py-0.5 rounded">SORTIE FILM</span>` : `S${ep.season}E${ep.number} – ${ep.epName}`;
                container.innerHTML += `
                <div onclick="openLibraryModal('${ep.mediaId}')" class="bg-gray-800 border border-gray-700 p-3 rounded-xl flex gap-3 items-center shadow cursor-pointer hover:border-gray-500 transition">
                    <img src="${ep.showImage}" class="w-10 h-14 object-cover rounded-lg bg-gray-900 shrink-0" />
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] uppercase font-black text-teal-400 truncate">${ep.showTitle}</div>
                        <h4 class="font-bold text-white text-xs truncate mt-0.5">${subTxt}</h4>
                        <span class="text-[10px] text-gray-500">${ep.airdate}</span>
                    </div>
                </div>`;
            });
        });
    }
