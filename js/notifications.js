// ==========================================
// NOTIFICATIONS.JS — Gestion des alertes et du son
// ==========================================

let notificationsEnabled = localStorage.getItem('tvr_notifications') === 'true';
let soundEnabled = localStorage.getItem('tvr_sound') === 'true';

function playNotificationSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Note D5
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (error) {
        console.warn("Lecture audio bloquée par le navigateur : attente d'une interaction utilisateur.");
    }
}

function send(title, options) {
    if (!notificationsEnabled) return;

    if (Notification.permission === 'granted') {
        new Notification(title, options);
        playNotificationSound();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, options);
                playNotificationSound();
            }
        });
    }
}

function notifyNewEpisodes() {
    const todayStr = new Date().toISOString().split('T')[0];
    let newEpsCount = 0;

    library.forEach(item => {
        if (item.type === 'series' && item.episodes) {
            item.episodes.forEach(ep => {
                if (ep.airdate === todayStr && !ep.watched) {
                    newEpsCount++;
                }
            });
        }
    });

    if (newEpsCount > 0) {
        send('Nouveaux épisodes disponibles !', {
            body: `Vous avez ${newEpsCount} nouvel(aux) épisode(s) diffusé(s) aujourd'hui.`,
            icon: './favicon.ico'
        });
    }
}

function startPeriodicChecks() {
    const lastCheck = localStorage.getItem('tvr_last_notif_check');
    const todayStr = new Date().toISOString().split('T')[0];

    if (lastCheck !== todayStr) {
        notifyNewEpisodes();
        localStorage.setItem('tvr_last_notif_check', todayStr);
    }
}

function startNotificationChecks() {
    if ('Notification' in window) {
        startPeriodicChecks();
        setInterval(startPeriodicChecks, 4 * 60 * 60 * 1000); 
    }
}

function toggleNotifications(enabled) {
    notificationsEnabled = enabled;
    localStorage.setItem('tvr_notifications', enabled);
    if (enabled && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    renderNotificationSettings();
}

function toggleSound(enabled) {
    soundEnabled = enabled;
    localStorage.setItem('tvr_sound', enabled);
    renderNotificationSettings();
}

function renderNotificationSettings() {
    const panel = document.getElementById('notificationSettingsPanel');
    if (!panel) return '';
    
    let html = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-sm font-bold text-white">Activer les notifications</div>
                    <div class="text-[10px] text-gray-400">Recevez une alerte lors de la sortie d'un épisode</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${notificationsEnabled ? 'checked' : ''} onchange="toggleNotifications(this.checked)">
                    <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
            </div>
            
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-sm font-bold text-white">Sons de notification</div>
                    <div class="text-[10px] text-gray-400">Jouer un petit son lors d'une alerte</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${soundEnabled ? 'checked' : ''} onchange="toggleSound(this.checked)">
                    <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
            </div>
        </div>
    `;

    panel.innerHTML = html;
    return html;
}
