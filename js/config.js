// ==========================================
// CONFIG.JS — Constantes API, clés, état global de l'application, observers
// ==========================================

    'use strict';
    
    // ==========================================
    // CLÉS API & CONFIGURATION
    // ==========================================
    const TVMAZE_API = 'https://api.tvmaze.com';
    const SUPABASE_URL = 'https://vjhegncviufyguzdrpdp.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_hLYKWsVftWedOIbDinl0mQ_9uGREGsw';
    const OMDB_API   = `https://www.omdbapi.com/?apikey=1e01c814`;
    
    // Renseigne ton Client ID Trakt ci-dessous
    const TRAKT_CLIENT_ID = 'X2BsPk1eeL-jMxDv3SmkmXjYmy09ccXAlyST98-N7Z4'; 
    
    let supabaseClient = null;
    const localUserId = 'tvr_master_user_2026';
    
    const globalMediaCache = new Map();
    const seasonColors = ['bg-teal-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-teal-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-teal-600', 'bg-cyan-600'];
    
    let currentMediaType = 'series', searchResults = [];
    let showsCache = [];
    let library = JSON.parse(localStorage.getItem('personal_tracker_db')) || [];
    let syncQueue = JSON.parse(localStorage.getItem('personal_tracker_sync_queue')) || [];
    let activeModalMediaIndex = null, activeModalSeason = null, modalMode = 'preview', previewEpisodes = [];
    let calFilter = 'all';
    
    let currentDiscoverMode = 'mix';
    let discoverMediaType = 'series'; 
    
    const PAGE_SIZE = 50;
    const MAX_RESULTS = 200;
    let searchPage = 1;
    let discoverResults = [];
    let discoverPage = 1;
    let todayString = new Date().toISOString().split('T')[0];

    let modalSuggestionsPool = [];
    let modalSuggestionsPage = 1;

    // Déclaration globale : on crée les instances d'observer ici
    const searchObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && searchPage * PAGE_SIZE < Math.min(searchResults.length, MAX_RESULTS)) { 
            searchPage++; 
            renderSearchGrid(false); 
        }
    });
    
    const discoverObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && discoverPage * PAGE_SIZE < Math.min(discoverResults.length, MAX_RESULTS)) { 
            discoverPage++; 
            renderDiscoverGrid(false); 
        }
    });
    
    const suggestionsObserver = new IntersectionObserver(entries => {
        if(entries[0].isIntersecting && modalSuggestionsPool.length > 0) { 
            modalSuggestionsPage++; 
            appendSuggestions(); 
        }
    });
