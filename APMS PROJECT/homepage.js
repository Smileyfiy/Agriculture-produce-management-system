document.addEventListener('DOMContentLoaded', function() {
  const themeOptions = document.querySelectorAll('.theme-option');

  themeOptions.forEach(option => {
    option.addEventListener('click', function(event) {
      event.preventDefault();
      const theme = this.getAttribute('data-theme');
      document.body.classList.toggle('dark-mode', theme === 'dark');
    });
  });
});