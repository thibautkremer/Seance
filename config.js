<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TV TIME REBORN</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link rel="preconnect" href="https://api.tvmaze.com">
    <link rel="preconnect" href="https://api.trakt.tv">
    <link rel="preconnect" href="https://vjhegncviufyguzdrpdp.supabase.co">
    <style>
        body { background-color: #111827; -webkit-tap-highlight-color: transparent; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .hidden { display: none !important; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .media-poster { width: 100%; aspect-ratio: 155.88 / 217.56; object-fit: cover; }
        .media-grid { display: grid; gap: 0.5rem; grid-template-columns: repeat(3, 1fr); }
        @media (min-width: 480px)  { .media-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 640px)  { .media-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 900px)  { .media-grid { grid-template-columns: repeat(6, 1fr); } }
        @media (min-width: 1200px) { .media-grid { grid-template-columns: repeat(8, 1fr); } }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 font-sans pb-20">

    <header class="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-md">
        <div class="max-w-screen-2xl mx-auto px-4 py-2.5 flex justify-between items-center">
            <h1 class="text-lg font-black tracking-wider text-teal-400">TV TIME <span class="text-white text-xs px-2 py-0.5 bg-teal-600 rounded">REBORN</span></h1>
            <div class="flex items-center gap-2">
                <button onclick="forceSync()" id="cloudStatus" class="cursor-pointer text-[10px] px-2 py-0.5 bg-gray-900 text-gray-400 rounded-full font-bold flex items-center gap-1 border border-gray-700">○ Local</button>
                <span id="libCount" class="text-[10px] px-2 py-0.5 bg-teal-950 text-teal-400 rounded-full font-bold border border-teal-900/50 hidden">0</span>
            </div>
        </div>
    </header>

    <main class="max-w-screen-2xl mx-auto px-3 sm:px-4 pt-4 w-full">
        <!-- Reste de ta structure HTML (tabs SEARCH, DISCOVER, CALENDAR, LIBRARY, PROFILE) -->
        <!-- J'ai conservé les IDs tels quels pour que ton JS les retrouve -->
        <div id="tab-search" class="space-y-4"> <!-- Contenu Search --> </div>
        <div id="tab-discover" class="space-y-4 hidden"> <!-- Contenu Discover --> </div>
        <div id="tab-calendar" class="space-y-4 hidden"> <!-- Contenu Calendar --> </div>
        <div id="tab-library" class="space-y-3 hidden"> <!-- Contenu Library --> </div>
        <div id="tab-profile" class="space-y-4 hidden"> <!-- Contenu Profile --> </div>

        <!-- MODAL -->
        <div id="mediaModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 hidden">
            <!-- Contenu Modal -->
        </div>
    </main>

    <nav class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 h-16 flex items-center justify-around z-40">
        <button onclick="switchTab('search')" id="nav-search" class="flex flex-col items-center text-xs text-teal-400 font-bold flex-1"><span class="text-lg">🔍</span><span class="text-[10px]">Chercher</span></button>
        <button onclick="switchTab('discover')" id="nav-discover" class="flex flex-col items-center text-xs text-gray-400 flex-1"><span class="text-lg">✨</span><span class="text-[10px]">Découvrir</span></button>
        <button onclick="switchTab('calendar')" id="nav-calendar" class="flex flex-col items-center text-xs text-gray-400 flex-1"><span class="text-lg">📅</span><span class="text-[10px]">Calendrier</span></button>
        <button onclick="switchTab('library')" id="nav-library" class="flex flex-col items-center text-xs text-gray-400 flex-1"><span class="text-lg">📚</span><span class="text-[10px]">Suivis</span></button>
        <button onclick="switchTab('profile')" id="nav-profile" class="flex flex-col items-center text-xs text-gray-400 flex-1"><span class="text-lg">📊</span><span class="text-[10px]">Profil</span></button>
    </nav>

    <!-- Chargement des scripts fragmentés -->
    <script src="config.js"></script>
    <script src="api.js"></script>
    <script src="ui.js"></script>
    <script src="app.js"></script>
</body>
</html>
