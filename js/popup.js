// --- THEME LOGIC ---
const themeToggle = document.getElementById('darkmode');
const themeLabel = document.getElementById('themeLabel');
const themeIcon = document.getElementById('themeIcon');

const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;

function setLightMode(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    themeToggle.checked = true;
    themeLabel.textContent = "Light Mode";
    themeIcon.innerHTML = sunSVG;
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-mode');
    themeToggle.checked = false;
    themeLabel.textContent = "Dark Mode";
    themeIcon.innerHTML = moonSVG;
    localStorage.setItem('theme', 'dark');
  }
}

if (localStorage.getItem('theme') === 'light') setLightMode(true);
else setLightMode(false);

themeToggle.addEventListener('change', function() {
  setLightMode(this.checked);
});

// --- STATS LOGIC ---
document.getElementById('toggleStats').addEventListener('change', async function() {
  const dashboard = document.getElementById('statsDashboard');
  if (this.checked) {
    dashboard.style.display = 'grid'; 
    await updateStatsDisplay(); 
  } else {
    dashboard.style.display = 'none'; 
  }
});

async function updateStatsDisplay() {
  const windows = await chrome.windows.getAll();
  const tabs = await chrome.tabs.query({});
  const pinnedTabs = await chrome.tabs.query({ pinned: true });
  
  const openWindowsCount = windows.length;
  const openTabsCount = tabs.length;
  const pinnedTabsCount = pinnedTabs.length;

  let totalSorted = parseInt(localStorage.getItem('totalSorted') || '0');
  let totalDeleted = parseInt(localStorage.getItem('totalDeleted') || '0');
  let ath = parseInt(localStorage.getItem('ath') || '0');
  let atl = parseInt(localStorage.getItem('atl') || '9999');

  if (openTabsCount > ath) {
    ath = openTabsCount;
    localStorage.setItem('ath', ath);
  }
  if (openTabsCount < atl && openTabsCount > 0) {
    atl = openTabsCount;
    localStorage.setItem('atl', atl);
  }

  document.getElementById('stat-windows').textContent = openWindowsCount;
  document.getElementById('stat-tabs').textContent = openTabsCount;
  document.getElementById('stat-pinned').textContent = pinnedTabsCount;
  document.getElementById('stat-sorted').textContent = totalSorted;
  document.getElementById('stat-deleted').textContent = totalDeleted;
  document.getElementById('stat-ath').textContent = `H:${ath}`;
  document.getElementById('stat-atl').textContent = `L:${atl}`;
}

// --- ACTION LOGIC (Silent) ---
document.getElementById('sortTabs').addEventListener('change', async function() {
  if (this.checked) {
    const count = await sortTabsByDomain();
    let currentTotal = parseInt(localStorage.getItem('totalSorted') || '0');
    localStorage.setItem('totalSorted', currentTotal + count);
    this.checked = false;
    if(document.getElementById('toggleStats').checked) updateStatsDisplay();
  }
});

document.getElementById('removeDups').addEventListener('change', async function() {
  if (this.checked) {
    const count = await removeDuplicateTabs();
    let currentTotal = parseInt(localStorage.getItem('totalDeleted') || '0');
    localStorage.setItem('totalDeleted', currentTotal + count);
    this.checked = false;
    if(document.getElementById('toggleStats').checked) updateStatsDisplay();
  }
});

document.getElementById('creator').addEventListener('change', function() {
  if (this.checked) {
    window.open('https://github.com/tylerhdang', '_blank');
    this.checked = false;
  }
});

// --- CORE FUNCTIONS ---
async function removeDuplicateTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const seenUrls = new Map();
  const duplicates = [];
  for (const tab of tabs) {
    if (tab.pinned) continue;
    if (seenUrls.has(tab.url)) {
      duplicates.push(tab.id);
    } else {
      seenUrls.set(tab.url, tab.id);
    }
  }
  if (duplicates.length > 0) {
    await chrome.tabs.remove(duplicates);
  }
  return duplicates.length;
}

async function sortTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const domainGroups = new Map();
  tabs.forEach(tab => {
    if (tab.pinned) return;
    try {
      const domain = new URL(tab.url).hostname;
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain).push(tab);
    } catch (e) {}
  });
  const sortedDomains = Array.from(domainGroups.keys()).sort((a, b) => {
    return domainGroups.get(b).length - domainGroups.get(a).length;
  });
  let newIndex = tabs.filter(t => t.pinned).length;
  for (const domain of sortedDomains) {
    for (const tab of domainGroups.get(domain)) {
      await chrome.tabs.move(tab.id, { index: newIndex++ });
    }
  }
  return sortedDomains.length;
}