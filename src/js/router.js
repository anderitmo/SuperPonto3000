export function initRouter() {
  const navTotem = document.getElementById('nav-totem');
  const navRh = document.getElementById('nav-rh');
  const viewTotem = document.getElementById('view-totem');
  const viewRh = document.getElementById('view-rh');

  function switchView(target) {
    if (target === 'totem') {
      viewTotem.classList.remove('hidden');
      viewRh.classList.add('hidden');
      navTotem.classList.add('active');
      navRh.classList.remove('active');
    } else if (target === 'rh') {
      viewTotem.classList.add('hidden');
      viewRh.classList.remove('hidden');
      navTotem.classList.remove('active');
      navRh.classList.add('active');
      // Trigger RH data refresh event
      window.dispatchEvent(new CustomEvent('rh-view-active'));
    }
  }

  navTotem.addEventListener('click', () => switchView('totem'));
  navRh.addEventListener('click', () => switchView('rh'));
}
