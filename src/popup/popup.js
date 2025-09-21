// DOM elements
const domainName = document.getElementById('domainName');
const siteStatus = document.getElementById('siteStatus');
const siteIcon = document.getElementById('siteIcon');
const scoreCircle = document.getElementById('scoreCircle');
const scoreValue = document.getElementById('scoreValue');
const detailsList = document.getElementById('detailsList');
const refreshBtn = document.getElementById('refreshBtn');
const historyBtn = document.getElementById('historyBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Current domain info
let currentDomainInfo = null;

// Initialize popup
async function initPopup() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      updateDomainInfo(url.hostname);
      
      // Check if we have cached info
      const { domainHistory } = await chrome.storage.local.get('domainHistory');
      const cachedInfo = domainHistory?.find(d => d.domain === url.hostname);
      
      if (cachedInfo) {
        updateUI(cachedInfo);
      } else {
        // Request fresh analysis
        chrome.runtime.sendMessage({
          type: 'analyzeDomain',
          domain: url.hostname
        });
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      showNoSite();
    }
  } else {
    showNoSite();
  }
  
  // Set up listeners
  refreshBtn.addEventListener('click', handleRefresh);
  historyBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html') });
  });
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html#settings') });
  });
  
  // Listen for security updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'securityUpdate') {
      updateUI(message.data);
    }
  });
}

// Update domain info in UI
function updateUI(domainInfo) {
  currentDomainInfo = domainInfo;
  
  domainName.textContent = domainInfo.domain;
  siteStatus.textContent = domainInfo.status.toUpperCase();
  siteStatus.className = `status-${domainInfo.status}`;
  
  // Update score
  scoreValue.textContent = domainInfo.score || '-';
  scoreCircle.style.backgroundColor = getScoreColor(domainInfo.score);
  
  // Update icon
  siteIcon.textContent = getDomainIcon(domainInfo.domain);
  
  // Update details
  detailsList.innerHTML = '';
  
  if (domainInfo.reasons && domainInfo.reasons.length) {
    domainInfo.reasons.forEach(reason => {
      const li = document.createElement('li');
      li.textContent = reason;
      detailsList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No security details available';
    detailsList.appendChild(li);
  }
}

// Show no active site state
function showNoSite() {
  domainName.textContent = 'No active site';
  siteStatus.textContent = 'Not analyzed';
  siteStatus.className = 'status-neutral';
  siteIcon.textContent = '🌐';
  scoreValue.textContent = '-';
  scoreCircle.style.backgroundColor = '#e2e8f0';
  
  detailsList.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = 'Navigate to a website to analyze security';
  detailsList.appendChild(li);
}

// Handle refresh button
async function handleRefresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      detailsList.innerHTML = '<li class="loading">Analyzing site...</li>';
      
      chrome.runtime.sendMessage({
        type: 'analyzeDomain',
        domain: url.hostname
      });
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  }
}

// Get color based on score
function getScoreColor(score) {
  if (!score) return '#e2e8f0';
  if (score >= 80) return '#a7f3d0'; // green
  if (score >= 50) return '#fde68a'; // yellow
  return '#fecaca'; // red
}

// Get icon for domain
function getDomainIcon(domain) {
  if (!domain) return '🌐';
  
  const socialDomains = ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit'];
  if (socialDomains.some(s => domain.includes(s))) return '💬';
  
  if (domain.includes('google')) return '🔍';
  if (domain.includes('amazon')) return '🛒';
  if (domain.includes('youtube')) return '📺';
  if (domain.includes('github')) return '💻';
  if (domain.includes('mail')) return '✉️';
  if (domain.includes('bank')) return '🏦';
  
  return '🌐';
}

// Update domain info
function updateDomainInfo(domain) {
  domainName.textContent = domain || 'No active site';
  siteIcon.textContent = getDomainIcon(domain);
}

// Initialize
document.addEventListener('DOMContentLoaded', initPopup);