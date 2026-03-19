// ======== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (упрощённая версия) ========
console.log('🎨 [THEME] Script started');

// Ждём, когда DOM точно загрузится
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 [THEME] DOM loaded');

    const btn = document.getElementById('themeSwitcher');
    const icon = document.getElementById('themeIcon');
    const body = document.body;

    console.log('🎨 [THEME] Elements found:', {
        btn: !!btn,
        icon: !!icon,
        body: !!body
    });

    if (!btn) {
        console.error('❌ [THEME] Button #themeSwitcher NOT found!');
        return;
    }

    // Применяем сохранённую тему
    const saved = localStorage.getItem('crm_theme');
    console.log('🎨 [THEME] Saved theme:', saved);

    if (saved === 'light') {
        body.classList.add('light-theme');
        if (icon) icon.className = 'bi bi-sun-fill';
        console.log('🎨 [THEME] Applied light theme');
    }

    // Клик по кнопке
    btn.addEventListener('click', function() {
        console.log('🎨 [THEME] Button clicked');

        const isLight = body.classList.toggle('light-theme');
        console.log('🎨 [THEME] light-theme class:', isLight);

        if (icon) {
            icon.className = isLight ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            console.log('🎨 [THEME] Icon updated:', isLight ? '☀️' : '🌙');
        }

        localStorage.setItem('crm_theme', isLight ? 'light' : 'dark');
        console.log('🎨 [THEME] Saved to localStorage:', isLight ? 'light' : 'dark');
    });

    console.log('🎨 [THEME] Initialization complete');
});