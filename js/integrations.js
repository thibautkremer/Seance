// ==========================================
// INTEGRATIONS.JS — Intégrations externes (Google Calendar, iCal, Trakt)
// ==========================================

/**
 * Système d'intégrations avec services externes
 */

class IntegrationManager {
    constructor() {
        this.integrations = this.loadIntegrations();
    }

    loadIntegrations() {
        const saved = localStorage.getItem('integrations');
        return saved ? JSON.parse(saved) : {
            googleCalendar: { enabled: false, token: null },
            ical: { enabled: false, calendarUrl: null },
            trakt: { enabled: false, token: null }
        };
    }

    saveIntegrations() {
        localStorage.setItem('integrations', JSON.stringify(this.integrations));
    }

    // ==========================================
    // GOOGLE CALENDAR INTEGRATION
    // ==========================================

    /**
     * Initialise Google Calendar OAuth
     */
    async initGoogleCalendar() {
        const clientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        const scope = 'https://www.googleapis.com/auth/calendar';
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', window.location.origin);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('scope', scope);

        window.location.href = authUrl.toString();
    }

    /**
     * Exporte les épisodes vers Google Calendar
     */
    async exportToGoogleCalendar() {
        if (!this.integrations.googleCalendar.enabled || !this.integrations.googleCalendar.token) {
            showErrorMessage('Google Calendar non connecté');
            return;
        }

        const token = this.integrations.googleCalendar.token;
        const events = [];

        library.forEach(item => {
            if (item.type !== 'series') return;

            item.episodes?.forEach(ep => {
                if (!ep.watched && ep.airdate) {
                    const date = new Date(ep.airdate);
                    events.push({
                        summary: `${item.title} - S${ep.season}E${ep.number}`,
                        description: `${item.summary || ''}\n\nRéseau: ${item.network}`,
                        start: { dateTime: date.toISOString() },
                        end: { dateTime: new Date(date.getTime() + 45 * 60000).toISOString() },
                        reminders: {
                            useDefault: true
                        }
                    });
                }
            });
        });

        for (const event of events) {
            try {
                await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(event)
                });
            } catch (e) {
                console.error('Erreur export Google Calendar:', e);
            }
        }

        showSuccessMessage(`${events.length} événements ajoutés à Google Calendar`);
    }

    // ==========================================
    // ICAL INTEGRATION
    // ==========================================

    /**
     * Génère un fichier iCal (.ics) exportable
     */
    generateICAL() {
        let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TV TIME REBORN//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Mes Séries TV
X-WR-CALDESC:Calendrier des épisodes à regarder
X-WR-TIMEZONE:UTC
`;

        library.forEach(item => {
            if (item.type !== 'series') return;

            item.episodes?.forEach(ep => {
                if (!ep.watched && ep.airdate) {
                    const date = new Date(ep.airdate);
                    const icalDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    const uid = `${item.id}-${ep.season}-${ep.number}@tvtimereborn.local`;

                    icalContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${icalDate}
DTEND:${new Date(date.getTime() + 45 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${item.title} - S${ep.season}E${ep.number}
DESCRIPTION:${item.summary || 'Épisode à regarder'}\nRéseau: ${item.network}
LOCATION:${item.network || 'Web'}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
`;
                }
            });
        });

        icalContent += 'END:VCALENDAR';
        return icalContent;
    }

    /**
     * Télécharge le fichier iCal
     */
    downloadICAL() {
        const icalData = this.generateICAL();
        const blob = new Blob([icalData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv-time-reborn-${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccessMessage('Fichier iCal téléchargé');
    }

    /**
     * Importe un calendrier iCal externe
     */
    async importICAL(icalUrl) {
        try {
            const response = await fetch(icalUrl);
            const icalText = await response.text();

            // Parser simplifié iCal
            const events = [];
            const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
            let match;

            while ((match = eventRegex.exec(icalText)) !== null) {
                const eventData = match[1];
                const summary = eventData.match(/SUMMARY:(.*)/)?.[1] || '';
                const dtstart = eventData.match(/DTSTART[^:]*:(.*)/)?.[1] || '';
                
                events.push({ summary, dtstart });
            }

            this.integrations.ical.enabled = true;
            this.integrations.ical.calendarUrl = icalUrl;
            this.saveIntegrations();

            showSuccessMessage(`${events.length} événements importés d'iCal`);
        } catch (e) {
            showErrorMessage('Erreur import iCal: ' + e.message);
        }
    }

    // ==========================================
    // TRAKT INTEGRATION
    // ==========================================

    /**
     * Initialise Trakt OAuth
     */
    async initTrakt() {
        const clientId = TRAKT_CLIENT_ID; // Défini dans config.js
        const redirectUri = window.location.origin;
        
        const authUrl = new URL('https://trakt.tv/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');

        window.location.href = authUrl.toString();
    }

    /**
     * Synchronise la bibliothèque avec Trakt
     */
    async syncWithTrakt() {
        if (!this.integrations.trakt.enabled || !this.integrations.trakt.token) {
            showErrorMessage('Trakt non connecté');
            return;
        }

        const token = this.integrations.trakt.token;

        try {
            // 1. Récupérer la watchlist de Trakt
            const watchlistRes = await fetch('https://api.trakt.tv/sync/watchlist', {
                headers: {
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                    'Authorization': `Bearer ${token}`
                }
            });

            const watchlist = await watchlistRes.json();

            // 2. Ajouter les nouveaux items à notre bibliothèque
            for (const item of watchlist) {
                const show = item.show || item.movie;
                const existingId = library.some(l => l.apiId === show.ids.trakt);

                if (!existingId) {
                    const mediaItem = {
                        id: `${show.type}-${show.ids.trakt}`,
                        apiId: show.ids.trakt,
                        title: show.title,
                        type: show.type === 'show' ? 'series' : 'movie',
                        status: 'In Progress',
                        image: show.image || '',
                        rating: show.rating || 0,
                        genres: show.genres || [],
                        status_production: show.status || 'Running',
                        premiered: show.year || new Date().getFullYear(),
                        network: show.network || 'Unknown',
                        date_added: Date.now(),
                        episodes: [],
                        user_rating: 0
                    };

                    library.push(mediaItem);
                }
            }

            saveLocalDB();
            showSuccessMessage('Synchronisé avec Trakt');
        } catch (e) {
            showErrorMessage('Erreur sync Trakt: ' + e.message);
        }
    }

    /**
     * Exporte vers Trakt
     */
    async exportToTrakt() {
        if (!this.integrations.trakt.enabled || !this.integrations.trakt.token) {
            showErrorMessage('Trakt non connecté');
            return;
        }

        const token = this.integrations.trakt.token;
        const watchlistItems = library.map(item => ({
            [item.type]: {
                title: item.title,
                year: parseInt(item.premiered) || new Date().getFullYear(),
                ids: { trakt: item.apiId }
            }
        }));

        try {
            await fetch('https://api.trakt.tv/sync/watchlist', {
                method: 'POST',
                headers: {
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [library[0].type + 's']: watchlistItems })
            });

            showSuccessMessage('Exporté vers Trakt');
        } catch (e) {
            showErrorMessage('Erreur export Trakt: ' + e.message);
        }
    }

    /**
     * Met à jour l'état de visionnage sur Trakt
     */
    async updateTraktWatchedStatus(mediaId) {
        if (!this.integrations.trakt.enabled) return;

        const item = library.find(l => l.id === mediaId);
        if (!item) return;

        const token = this.integrations.trakt.token;
        const endpoint = item.status === 'Watched' ? 'watched' : 'watchlist';

        try {
            await fetch(`https://api.trakt.tv/sync/${endpoint}`, {
                method: 'POST',
                headers: {
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [item.type + 's']: [{
                        title: item.title,
                        year: parseInt(item.premiered) || new Date().getFullYear(),
                        ids: { trakt: item.apiId }
                    }]
                })
            });
        } catch (e) {
            console.error('Erreur update Trakt:', e);
        }
    }
}

// Instance globale
const integrationManager = new IntegrationManager();

// ==========================================
// UI FUNCTIONS POUR LES INTÉGRATIONS
// ==========================================

function renderIntegrationSettings() {
    const integ = integrationManager.integrations;

    const html = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
            <h3 class="text-sm font-bold text-teal-400">🔗 Intégrations</h3>

            <!-- Google Calendar -->
            <div class="border-b border-gray-700 pb-3">
                <div class="flex justify-between items-center mb-2">
                    <label class="text-xs font-bold text-gray-300">Google Calendar</label>
                    <span class="text-[10px] ${integ.googleCalendar.enabled ? 'text-emerald-400' : 'text-gray-500'}">
                        ${integ.googleCalendar.enabled ? '✓ Connecté' : '✗ Déconnecté'}
                    </span>
                </div>
                <button onclick="integrationManager.initGoogleCalendar()" 
                    class="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition">
                    ${integ.googleCalendar.enabled ? '🔄 Reconnecter' : '🔗 Connecter à Google'}
                </button>
                ${integ.googleCalendar.enabled ? `
                    <button onclick="integrationManager.exportToGoogleCalendar()" 
                        class="w-full text-xs px-3 py-2 mt-2 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded transition">
                        📅 Exporter vers Google Calendar
                    </button>
                ` : ''}
            </div>

            <!-- iCal -->
            <div class="border-b border-gray-700 pb-3">
                <label class="text-xs font-bold text-gray-300 block mb-2">📆 iCal</label>
                <div class="flex gap-2">
                    <button onclick="integrationManager.downloadICAL()" 
                        class="flex-1 text-xs px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition">
                        📥 Télécharger
                    </button>
                    <button onclick="document.getElementById('icalUrlInput').style.display = document.getElementById('icalUrlInput').style.display === 'none' ? 'block' : 'none'" 
                        class="flex-1 text-xs px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition">
                        📤 Importer
                    </button>
                </div>
                <div id="icalUrlInput" style="display: none;" class="mt-2">
                    <input type="url" placeholder="URL du calendrier iCal" id="icalUrl" 
                        class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white mb-2">
                    <button onclick="integrationManager.importICAL(document.getElementById('icalUrl').value)" 
                        class="w-full text-xs px-3 py-1 bg-purple-700 hover:bg-purple-600 text-purple-200 rounded transition">
                        Importer
                    </button>
                </div>
            </div>

            <!-- Trakt -->
            <div>
                <div class="flex justify-between items-center mb-2">
                    <label class="text-xs font-bold text-gray-300">Trakt.tv</label>
                    <span class="text-[10px] ${integ.trakt.enabled ? 'text-emerald-400' : 'text-gray-500'}">
                        ${integ.trakt.enabled ? '✓ Connecté' : '✗ Déconnecté'}
                    </span>
                </div>
                <button onclick="integrationManager.initTrakt()" 
                    class="w-full text-xs px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition">
                    ${integ.trakt.enabled ? '🔄 Reconnecter' : '🔗 Connecter à Trakt'}
                </button>
                ${integ.trakt.enabled ? `
                    <div class="flex gap-2 mt-2">
                        <button onclick="integrationManager.syncWithTrakt()" 
                            class="flex-1 text-xs px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded transition">
                            🔄 Synchroniser
                        </button>
                        <button onclick="integrationManager.exportToTrakt()" 
                            class="flex-1 text-xs px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded transition">
                            📤 Exporter
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return html;
}
