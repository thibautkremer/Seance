// ==========================================
// NOTIFICATIONS.JS — Système de notifications
// ==========================================

/**
 * Gestion des notifications pour nouveaux épisodes et alertes
 */

class NotificationManager {
    constructor() {
        this.preferences = this.loadPreferences();
        this.registeredServiceWorker = false;
        this.init();
    }

    async init() {
        if ('serviceWorker' in navigator && 'Notification' in window) {
            try {
                await navigator.serviceWorker.ready;
                this.registeredServiceWorker = true;
                this.requestPermission();
            } catch (e) {
                console.warn('Service Worker not available');
            }
        }
    }

    loadPreferences() {
        const saved = localStorage.getItem('notification_preferences');
        return saved ? JSON.parse(saved) : {
            enabled: true,
            newEpisodes: true,
            releases: true,
            recommendations: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '08:00',
            notificationSound: true
        };
    }

    savePreferences() {
        localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    }

    requestPermission() {
        if (Notification.permission === 'granted') return;
        if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    /**
     * Vérifie si on est dans les heures calmes
     */
    isQuietHours() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const start = this.preferences.quiet_hours_start;
        const end = this.preferences.quiet_hours_end;

        // Si start > end (ex: 22:00 -> 08:00), on traverse minuit
        if (start > end) {
            return currentTime >= start || currentTime < end;
        }
        return currentTime >= start && currentTime < end;
    }

    /**
     * Envoie une notification
     */
    send(title, options = {}) {
        if (!this.preferences.enabled || Notification.permission !== 'granted') {
            return;
        }

        if (this.isQuietHours() && !options.force) {
            return;
        }

        const notification = new Notification(title, {
            icon: 'https://placehold.co/192/0D9488/111827?text=TTR',
            badge: 'https://placehold.co/96/0D9488/111827?text=TTR',
            tag: options.tag || 'ttr-notification',
            requireInteraction: options.requireInteraction || false,
            ...options
        });

        if (this.preferences.notificationSound) {
            this.playNotificationSound();
        }

        if (options.onclick) {
            notification.onclick = options.onclick;
        }

        return notification;
    }

    /**
     * Son de notification simple
     */
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.warn('Notification sound error:', e);
        }
    }

    /**
     * Notifie les nouveaux épisodes disponibles
     */
    notifyNewEpisodes() {
        if (!this.preferences.newEpisodes) return;

        const today = todayString;
        const newEpisodes = [];

        library.forEach(item => {
            if (item.type !== 'series' || item.status === 'Watched' || item.status === 'Abandoned') return;

            const nextEpisode = item.episodes?.find(e => 
                !e.watched && e.airdate && e.airdate === today
            );

            if (nextEpisode) {
                newEpisodes.push({
                    show: item.title,
                    episode: `S${nextEpisode.season}E${nextEpisode.number}`,
                    mediaId: item.id
                });
            }
        });

        if (newEpisodes.length > 0) {
            const titles = newEpisodes.map(e => `${e.show} ${e.episode}`).join(', ');
            this.send('🎬 Nouveaux épisodes disponibles !', {
                body: titles,
                tag: 'new-episodes',
                requireInteraction: true,
                onclick: () => {
                    window.focus();
                    switchTab('calendar');
                }
            });
        }
    }

    /**
     * Notifie les nouvelles sorties
     */
    async notifyNewReleases() {
        if (!this.preferences.releases) return;

        const upcomingThisWeek = await this.getUpcomingReleases(7);

        if (upcomingThisWeek.length > 0) {
            this.send('🍿 Nouvelles sorties cette semaine !', {
                body: `${upcomingThisWeek.length} film(s) ou série(s) sortent bientôt`,
                tag: 'new-releases',
                onclick: () => {
                    window.focus();
                    switchTab('discover');
                }
            });
        }
    }

    /**
     * Notifie les recommandations
     */
    async notifyRecommendations() {
        if (!this.preferences.recommendations) return;

        const recommendations = await aiEngine.generateRecommendations({ limit: 5 });

        if (recommendations.length > 0) {
            this.send('✨ Recommandations personnalisées', {
                body: recommendations[0].title,
                tag: 'recommendations',
                onclick: () => {
                    window.focus();
                    openPreviewModal(recommendations[0]);
                }
            });
        }
    }

    /**
     * Récupère les sorties de la semaine
     */
    async getUpcomingReleases(daysAhead = 7) {
        const upcoming = [];
        const today = new Date();
        const endDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        try {
            await ensureShowsPool();
            const upcomingShows = showsCache.filter(show => {
                if (!show.premiered) return false;
                const premiere = new Date(show.premiered);
                return premiere >= today && premiere <= endDate;
            });
            upcoming.push(...upcomingShows.slice(0, 10).map(normalizeShow));
        } catch (e) {
            console.warn('Error fetching upcoming releases:', e);
        }

        return upcoming;
    }

    /**
     * Configure les préférences
     */
    updatePreferences(prefs) {
        this.preferences = { ...this.preferences, ...prefs };
        this.savePreferences();
    }

    /**
     * Lance les vérifications périodiques
     */
    startPeriodicChecks(intervalMinutes = 60) {
        setInterval(() => {
            this.notifyNewEpisodes();
            this.notifyNewReleases();
        }, intervalMinutes * 60 * 1000);

        // Première vérification immédiate
        this.notifyNewEpisodes();
    }
}

// Instance globale
const notificationManager = new NotificationManager();

// ==========================================
// UI FUNCTIONS POUR LES NOTIFICATIONS
// ==========================================

function renderNotificationSettings() {
    const prefs = notificationManager.preferences;

    const html = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
            <h3 class="text-sm font-bold text-teal-400">🔔 Paramètres de notifications</h3>

            <!-- Toggle principal -->
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-300">Notifications activées</label>
                <input type="checkbox" ${prefs.enabled ? 'checked' : ''} 
                    onchange="updateNotificationPref('enabled', this.checked)"
                    class="toggle-checkbox">
            </div>

            <!-- Notifications épisodes -->
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-300">🎬 Nouveaux épisodes</label>
                <input type="checkbox" ${prefs.newEpisodes ? 'checked' : ''} 
                    onchange="updateNotificationPref('newEpisodes', this.checked)"
                    class="toggle-checkbox">
            </div>

            <!-- Notifications sorties -->
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-300">🍿 Nouvelles sorties</label>
                <input type="checkbox" ${prefs.releases ? 'checked' : ''} 
                    onchange="updateNotificationPref('releases', this.checked)"
                    class="toggle-checkbox">
            </div>

            <!-- Notifications recommandations -->
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-300">✨ Recommandations</label>
                <input type="checkbox" ${prefs.recommendations ? 'checked' : ''} 
                    onchange="updateNotificationPref('recommendations', this.checked)"
                    class="toggle-checkbox">
            </div>

            <!-- Son -->
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-300">🔊 Son de notification</label>
                <input type="checkbox" ${prefs.notificationSound ? 'checked' : ''} 
                    onchange="updateNotificationPref('notificationSound', this.checked)"
                    class="toggle-checkbox">
            </div>

            <!-- Heures calmes -->
            <div class="border-t border-gray-700 pt-3">
                <h4 class="text-xs font-bold text-gray-400 mb-2">⏰ Heures calmes</h4>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[10px] text-gray-400">De</label>
                        <input type="time" value="${prefs.quiet_hours_start}" 
                            onchange="updateNotificationPref('quiet_hours_start', this.value)"
                            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400">À</label>
                        <input type="time" value="${prefs.quiet_hours_end}" 
                            onchange="updateNotificationPref('quiet_hours_end', this.value)"
                            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white">
                    </div>
                </div>
                <p class="text-[9px] text-gray-500 mt-1">Pas de notifications entre ces heures</p>
            </div>

            <!-- Test -->
            <button onclick="testNotification()" 
                class="w-full mt-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded transition">
                🔔 Tester une notification
            </button>
        </div>
    `;

    return html;
}

function updateNotificationPref(key, value) {
    notificationManager.updatePreferences({ [key]: value });
}

function testNotification() {
    notificationManager.send('Test de notification', {
        body: 'Ceci est un test - Tout fonctionne ! 🎉',
        tag: 'test-notification',
        force: true
    });
}

function startNotificationChecks() {
    // Lance les vérifications toutes les heures
    notificationManager.startPeriodicChecks(60);
}
