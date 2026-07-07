// ==========================================
// SYNC.JS — Synchronisation cloud Supabase
// ==========================================

    // --- SYNCHRO SUPABASE ---
    function initSupabase() {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            forceSync();
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') processSyncQueue(); });
        } catch(e) {}
    }

    function setCloudStatus(status) {
        const el = document.getElementById('cloudStatus');
        if (status === 'syncing') el.innerHTML = 'Sync...';
        else if (status === 'offline') el.innerHTML = 'Hors-ligne';
        else el.innerHTML = '✓ Synchro OK';
    }

    function queueForSync(mediaId) {
        if (!syncQueue.includes(mediaId)) syncQueue.push(mediaId);
        try {
            localStorage.setItem('personal_tracker_sync_queue', JSON.stringify(syncQueue));
            processSyncQueue();
        } catch (e) { console.error("Impossible de sauvegarder la file d'attente (Quota)"); }
    }

    async function processSyncQueue() {
        if (!supabaseClient || syncQueue.length === 0) return;
        setCloudStatus('syncing');
        for (let i = syncQueue.length - 1; i >= 0; i--) {
            const id = syncQueue[i];
            const item = library.find(x => x.id === id);
            try {
                if (item) await supabaseClient.from('user_library').upsert({ user_id: localUserId, media_id: id, media_data: item, last_modified: item.last_modified }, { onConflict: 'user_id, media_id' });
                else await supabaseClient.from('user_library').delete().match({ user_id: localUserId, media_id: id });
                syncQueue.splice(i, 1);
            } catch (e) {}
        }
        localStorage.setItem('personal_tracker_sync_queue', JSON.stringify(syncQueue));
        setCloudStatus('online');
    }

    async function forceSync() {
        if (!supabaseClient) return;
        setCloudStatus('syncing');
        try {
            const { data, error } = await supabaseClient.from('user_library').select('*').eq('user_id', localUserId);
            if(error) throw error;
            
            if (data && data.length > 0) {
                let localUpdated = false;
                data.forEach(cloudRow => {
                    const localIdx = library.findIndex(x => x.id === cloudRow.media_id);
                    if (localIdx === -1) { 
                        library.push(cloudRow.media_data); 
                        localUpdated = true; 
                    } else if ((cloudRow.last_modified||0) > (library[localIdx].last_modified||0)) { 
                        library[localIdx] = cloudRow.media_data; 
                        localUpdated = true; 
                    }
                });
                if (localUpdated) { 
                    deduplicateLibrary(); 
                    saveLocalDB(); 
                    if(!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
                    if(!document.getElementById('tab-profile').classList.contains('hidden')) renderProfile();
                }
            }
            processSyncQueue();
        } catch(e) { setCloudStatus('offline'); }
    }
