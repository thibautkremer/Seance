// ==========================================
// UI-IMPROVEMENTS.JS — Améliorations UI/UX, Dark/Light mode, Animations
// ==========================================

/**
 * Système de thème et améliorations UX
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.themes = {
            dark: {
                name: 'Sombre',
                colors: {
                    bg: '#111827',
                    surface: '#1f2937',
                    surfaceLight: '#374151',
                    text: '#f3f4f6',
                    textSecondary: '#d1d5db',
                    primary: '#0d9488',
                    primaryLight: '#14b8a6',
                    accent: '#f59e0b',
                    danger: '#ef4444'
                }
            },
            light: {
                name: 'Clair',
                colors: {
                    bg: '#f9fafb',
                    surface: '#ffffff',
                    surfaceLight: '#f3f4f6',
                    text: '#111827',
                    textSecondary: '#6b7280',
                    primary: '#0d9488',
                    primaryLight: '#14b8a6',
                    accent: '#f59e0b',
                    danger: '#ef4444'
                }
            }
        };
        this.apply();
    }

    loadTheme() {
        const saved = localStorage.getItem('app_theme');
        if (saved) return saved;
        
        // Détecte la préférence système
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    saveTheme() {
        localStorage.setItem('app_theme', this.currentTheme);
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.saveTheme();
        this.apply();
    }

    apply() {
        const isDark = this.currentTheme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        document.body.style.colorScheme = this.currentTheme;

        // Appliquer les variables CSS
        const theme = this.themes[this.currentTheme];
        Object.entries(theme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--color-${key}`, value);
        });

        // Mettre à jour le métathème
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', theme.colors.primary);
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Instance globale
const themeManager = new ThemeManager();

// ==========================================
// ANIMATIONS ET TRANSITIONS
// ==========================================

class AnimationManager {
    constructor() {
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Fade in animation
     */
    fadeIn(element, duration = 300) {
        if (this.prefersReducedMotion) {
            element.style.opacity = '1';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease-in`;
            
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                setTimeout(resolve, duration);
            });
        });
    }

    /**
     * Slide in animation
     */
    slideIn(element, direction = 'up', duration = 300) {
        if (this.prefersReducedMotion) {
            element.style.transform = 'none';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const directionMap = {
                up: 'translateY(20px)',
                down: 'translateY(-20px)',
                left: 'translateX(20px)',
                right: 'translateX(-20px)'
            };

            element.style.opacity = '0';
            element.style.transform = directionMap[direction];
            element.style.transition = `all ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;

            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'none';
                setTimeout(resolve, duration);
            });
        });
    }

    /**
     * Pulse animation pour attirer l'attention
     */
    pulse(element, duration = 1000, iterations = 2) {
        if (this.prefersReducedMotion) return Promise.resolve();

        return new Promise((resolve) => {
            let count = 0;
            const interval = setInterval(() => {
                element.style.opacity = count % 2 === 0 ? '0.5' : '1';
                count++;
                if (count >= iterations * 2) {
                    clearInterval(interval);
                    element.style.opacity = '1';
                    resolve();
                }
            }, duration / (iterations * 2));
        });
    }

    /**
     * Shake animation pour erreurs
     */
    shake(element, duration = 400) {
        if (this.prefersReducedMotion) return Promise.resolve();

        return new Promise((resolve) => {
            const keyframes = [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(0)' }
            ];

            const animation = element.animate(keyframes, {
                duration,
                easing: 'ease-in-out'
            });

            animation.onfinish = resolve;
        });
    }
}

// Instance globale
const animationManager = new AnimationManager();

// ==========================================
// ACCESSIBILITÉ
// ==========================================

class AccessibilityManager {
    constructor() {
        this.initKeyboardNavigation();
        this.initScreenReaderAnnouncements();
    }

    /**
     * Navigation au clavier (Tab, Arrow keys, Enter)
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Alt+T pour toggle thème
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                themeManager.toggle();
            }

            // Échap pour fermer modal
            if (e.key === 'Escape') {
                const modal = document.getElementById('mediaModal');
                if (!modal.classList.contains('hidden')) {
                    closeModal();
                }
            }

            // Tab navigation améliorée
            if (e.key === 'Tab') {
                this.updateFocusIndicator();
            }
        });
    }

    /**
     * Mise à jour de l'indicateur de focus
     */
    updateFocusIndicator() {
        const focused = document.activeElement;
        if (focused && focused !== document.body) {
            focused.style.outline = '2px solid var(--color-primary)';
            focused.style.outlineOffset = '2px';
        }
    }

    /**
     * Annonces pour lecteurs d'écran
     */
    initScreenReaderAnnouncements() {
        // Créer une région ARIA live
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }

    /**
     * Annonce un message aux lecteurs d'écran
     */
    announce(message) {
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 5000);
        }
    }

    /**
     * Ajoute les labels ARIA manquants
     */
    enhanceARIALabels() {
        document.querySelectorAll('[onclick]:not([aria-label]):not([title])').forEach(btn => {
            const text = btn.textContent.trim();
            if (text) {
                btn.setAttribute('aria-label', text);
            }
        });

        // Boutons avec icônes uniquement
        document.querySelectorAll('button:has(only-icon)').forEach(btn => {
            const icon = btn.querySelector('[class*="icon"], [class*="emoji"]');
            if (icon && !btn.getAttribute('aria-label')) {
                btn.setAttribute('aria-label', icon.textContent || btn.title);
            }
        });
    }

    /**
     * Force les tailles minimum pour l'accessibilité mobile
     */
    enforceMinTouchTargets() {
        const MIN_SIZE = 44; // pixels
        document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]').forEach(el => {
            const style = window.getComputedStyle(el);
            const width = el.offsetWidth;
            const height = el.offsetHeight;

            if (width < MIN_SIZE || height < MIN_SIZE) {
                el.style.padding = '12px';
                el.style.minWidth = MIN_SIZE + 'px';
                el.style.minHeight = MIN_SIZE + 'px';
            }
        });
    }
}

// Instance globale
const a11y = new AccessibilityManager();

// ==========================================
// RESPONSIVE UTILITIES
// ==========================================

class ResponsiveManager {
    constructor() {
        this.breakpoints = {
            xs: 0,
            sm: 480,
            md: 768,
            lg: 1024,
            xl: 1280,
            '2xl': 1536
        };
        this.currentBreakpoint = this.getBreakpoint();
        window.addEventListener('resize', () => this.onResize());
    }

    getBreakpoint() {
        const width = window.innerWidth;
        for (const [name, px] of Object.entries(this.breakpoints).reverse()) {
            if (width >= px) return name;
        }
        return 'xs';
    }

    onResize() {
        const newBreakpoint = this.getBreakpoint();
        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.triggerBreakpointChange(newBreakpoint);
        }
    }

    triggerBreakpointChange(breakpoint) {
        const event = new CustomEvent('breakpointChange', { detail: { breakpoint } });
        window.dispatchEvent(event);
    }

    isMobile() {
        return this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
    }

    isTablet() {
        return this.currentBreakpoint === 'md' || this.currentBreakpoint === 'lg';
    }

    isDesktop() {
        return this.currentBreakpoint === 'xl' || this.currentBreakpoint === '2xl';
    }
}

// Instance globale
const responsiveManager = new ResponsiveManager();

// ==========================================
// UI HELPER FUNCTIONS
// ==========================================

function renderThemeToggle() {
    const isDark = themeManager.currentTheme === 'dark';
    return `
        <button onclick="themeManager.toggle()" 
            title="Toggle theme (Alt+T)"
            aria-label="Toggle dark mode"
            class="text-white hover:text-teal-400 transition">
            ${isDark ? '☀️' : '🌙'}
        </button>
    `;
}

function showSuccessMessage(message) {
    const el = document.createElement('div');
    el.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg';
    el.textContent = message;
    document.body.appendChild(el);

    animationManager.slideIn(el, 'right');

    setTimeout(() => {
        animationManager.fadeIn(el).then(() => {
            el.remove();
        });
    }, 3000);

    a11y.announce(message);
}

function showErrorMessage(message) {
    const el = document.createElement('div');
    el.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg';
    el.textContent = message;
    document.body.appendChild(el);

    animationManager.shake(el);
    a11y.announce(`Erreur: ${message}`);

    setTimeout(() => el.remove(), 5000);
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    a11y.enhanceARIALabels();
    a11y.enforceMinTouchTargets();
});
