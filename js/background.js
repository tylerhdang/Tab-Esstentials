// background.js

// Listen for keyboard shortcuts globally
chrome.commands.onCommand.addListener((command) => {
  console.log(`Command received: ${command}`); // Debugging log

  if (command === "sort-tabs") {
    sortTabsByDomain();
  } else if (command === "remove-duplicates") {
    removeDuplicateTabs();
  }
});

// --- BADGE COUNTER LOGIC ---
function updateBadge() {
  chrome.tabs.query({}, (tabs) => {
    const count = tabs.length.toString();
    chrome.action.setBadgeText({ text: count });
    chrome.action.setBadgeBackgroundColor({ color: '#5353ff' });
  });
}

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);

// Run once on startup
updateBadge();


// --- CORE FUNCTIONS ---
async function removeDuplicateTabs() {
  console.log("Removing duplicates...");
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
    console.log(`Removed ${duplicates.length} duplicates.`);
  }
  updateBadge();
}

async function sortTabsByDomain() {
  console.log("Sorting tabs...");
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
  console.log("Sort complete.");
}