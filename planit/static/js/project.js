/* Project specific Javascript goes here. */

document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality removed for future release
    /*
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-mode');
            document.body.classList.toggle('dark-mode');
            
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }

    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const isLight = savedTheme === 'light';
    document.body.classList.add(isLight ? 'light-mode' : 'dark-mode');
    document.body.classList.remove(isLight ? 'dark-mode' : 'light-mode');
    */

    // Force dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
});
