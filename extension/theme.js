/**
 * ═══════════════════════════════════════════════════════════════════════════
 * iOS 26 LIQUID GLASS THEME SYSTEM
 * Premium Chrome Extension - Theme Switching & Micro-Animations
 * ═══════════════════════════════════════════════════════════════════════════
 */

class LiquidGlassTheme {
    constructor() {
        this.STORAGE_KEY = 'liquid-glass-theme';
        this.TRANSITION_DURATION = 350;
        
        this.init();
    }

    /**
     * Initialize the theme system
     */
    init() {
        // Apply saved theme or detect system preference
        this.applySavedTheme();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize micro-animations
        this.initializeAnimations();
        
        // Listen for system theme changes
        this.watchSystemTheme();
    }

    /**
     * Get current theme from storage or system preference
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) return saved;
        } catch (e) {
            console.warn('LocalStorage not available, using system preference');
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Save theme preference
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (e) {
            console.warn('Could not save theme preference');
        }
    }

    /**
     * Apply saved theme on load
     */
    applySavedTheme() {
        const theme = this.getSavedTheme();
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.setTheme(newTheme);
    }

    /**
     * Set a specific theme with smooth transition
     */
    setTheme(theme) {
        // Add transition class for smooth crossfade
        document.body.classList.add('theme-transitioning');
        
        // Apply the new theme
        document.documentElement.setAttribute('data-theme', theme);
        this.saveTheme(theme);
        
        // Remove transition class after animation completes
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, this.TRANSITION_DURATION);
        
        // Animate the toggle button
        this.animateToggleButton();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Theme toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Add ripple effect to all buttons with .btn-ripple class
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-ripple');
            if (button) {
                this.createRipple(e, button);
            }
        });

        // Add hover effects to glass elements
        document.querySelectorAll('.glass-shimmer').forEach(element => {
            element.addEventListener('mouseenter', () => this.onGlassHover(element));
        });
    }

    /**
     * Watch for system theme changes
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                try {
                    if (!localStorage.getItem(this.STORAGE_KEY)) {
                        this.setTheme(e.matches ? 'dark' : 'light');
                    }
                } catch (err) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Animate the theme toggle button
     */
    animateToggleButton() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.style.transform = 'scale(0.9) rotate(180deg)';
            setTimeout(() => {
                toggleBtn.style.transform = 'scale(1) rotate(360deg)';
            }, 150);
            setTimeout(() => {
                toggleBtn.style.transform = '';
            }, 500);
        }
    }

    /**
     * Create ripple effect on button click
     */
    createRipple(event, button) {
        // Remove existing ripples
        const existingRipples = button.querySelectorAll('.ripple');
        existingRipples.forEach(ripple => ripple.remove());

        // Create new ripple
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        button.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Handle glass element hover
     */
    onGlassHover(element) {
        // Add subtle glow effect
        element.style.boxShadow = 'var(--glass-shadow-elevated)';
    }

    /**
     * Initialize page animations
     */
    initializeAnimations() {
        // Stagger animation for sections on load
        this.animateSectionsOnLoad();
        
        // Set up intersection observer for scroll animations
        this.setupScrollAnimations();
    }

    /**
     * Animate sections on page load
     */
    animateSectionsOnLoad() {
        const sections = document.querySelectorAll('.section');
        
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 100 + (index * 80));
        });

        // Animate header
        const header = document.querySelector('.app-header');
        if (header) {
            header.style.opacity = '0';
            header.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                header.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                header.style.opacity = '1';
                header.style.transform = 'translateY(0)';
            }, 50);
        }
    }

    /**
     * Set up scroll-based animations
     */
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe cards and sections
        document.querySelectorAll('.experience-card, .project-card, .skill-tag').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Add parallax effect to background orbs
     */
    initParallax() {
        const background = document.querySelector('.app-background');
        if (!background) return;

        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            background.style.setProperty('--parallax-x', `${x}px`);
            background.style.setProperty('--parallax-y', `${y}px`);
        });
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Add smooth transition to elements when they appear
 */
function animateElement(element, delay = 0) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px) scale(0.98)';
    
    setTimeout(() => {
        element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0) scale(1)';
    }, delay);
}

/**
 * Create a pulsing glow effect
 */
function pulseGlow(element) {
    element.classList.add('pulse-glow');
    setTimeout(() => element.classList.remove('pulse-glow'), 1000);
}

/**
 * Shake animation for error states
 */
function shakeElement(element) {
    element.style.animation = 'shake 0.4s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 400);
}

// Add shake keyframes dynamically
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
}

@keyframes pulse-glow {
    0%, 100% { box-shadow: var(--glass-shadow); }
    50% { box-shadow: 0 0 30px var(--accent-primary-glow); }
}

.pulse-glow {
    animation: pulse-glow 1s ease;
}

.animate-in {
    animation: fadeSlideIn 0.4s ease forwards;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = shakeKeyframes;
document.head.appendChild(styleSheet);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INITIALIZE THEME SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.liquidGlassTheme = new LiquidGlassTheme();
    });
} else {
    window.liquidGlassTheme = new LiquidGlassTheme();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LiquidGlassTheme, animateElement, pulseGlow, shakeElement };
}

