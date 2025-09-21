// Security scoring constants
const SECURITY_SCORES = {
  HTTPS: 30,
  HSTS: 20,
  CSP: 20,
  X_FRAME_OPTIONS: 15,
  X_XSS_PROTECTION: 15
};

// Mock malicious domains database
const MALICIOUS_DOMAINS = [
  'phishingsite.com',
  'malware-distribution.net',
  'scam-website.org',
  'fake-login-page.com'
];

// Track current tab and domain
let currentTabId = null;
let currentDomain = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ domainHistory: [], emailHistory: [] });
  setupAlarms();
});

// Monitor tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  currentTabId = activeInfo.tabId;
  updateTabInfo(currentTabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTabId && changeInfo.status === 'complete') {
    updateTabInfo(tabId);
  }
});

// Update tab information and check security
async function updateTabInfo(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  try {
    const url = new URL(tab.url);
    if (url.hostname !== currentDomain) {
      currentDomain = url.hostname;
      const securityInfo = await checkDomainSecurity(tabId, url);
      showSecurityNotification(securityInfo);
      storeDomainResult(securityInfo);
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
  }
}

// Check domain security
async function checkDomainSecurity(tabId, url) {
  const domain = url.hostname;
  const isMalicious = MALICIOUS_DOMAINS.includes(domain);
  
  if (isMalicious) {
    return {
      domain,
      status: 'unsafe',
      score: 0,
      reasons: ['Known malicious domain'],
      timestamp: new Date().toISOString()
    };
  }

  // Get security headers (mock implementation - in real extension would use chrome.webRequest)
  const securityHeaders = {
    hasHttps: url.protocol === 'https:',
    hasHsts: Math.random() > 0.3, // 70% chance
    hasCsp: Math.random() > 0.5, // 50% chance
    hasXFrameOptions: Math.random() > 0.4, // 60% chance
    hasXXssProtection: Math.random() > 0.6 // 40% chance
  };

  // Calculate security score
  let score = 0;
  const reasons = [];

  if (securityHeaders.hasHttps) {
    score += SECURITY_SCORES.HTTPS;
    reasons.push('HTTPS enabled');
  } else {
    reasons.push('No HTTPS - insecure connection');
  }

  if (securityHeaders.hasHsts) {
    score += SECURITY_SCORES.HSTS;
    reasons.push('HSTS header present');
  }

  if (securityHeaders.hasCsp) {
    score += SECURITY_SCORES.CSP;
    reasons.push('Content Security Policy present');
  }

  if (securityHeaders.hasXFrameOptions) {
    score += SECURITY_SCORES.X_FRAME_OPTIONS;
    reasons.push('X-Frame-Options header present');
  }

  if (securityHeaders.hasXXssProtection) {
    score += SECURITY_SCORES.X_XSS_PROTECTION;
    reasons.push('X-XSS-Protection header present');
  }

  // Determine status
  let status;
  if (score >= 80) {
    status = 'safe';
  } else if (score >= 50) {
    status = 'suspicious';
  } else {
    status = 'unsafe';
  }

  return {
    domain,
    status,
    score,
    reasons,
    timestamp: new Date().toISOString()
  };
}

// Show security notification
function showSecurityNotification(securityInfo) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon-48.png',
    title: `Security Alert: ${securityInfo.domain}`,
    message: `This site is classified as ${securityInfo.status.toUpperCase()}`,
    priority: securityInfo.status === 'unsafe' ? 2 : 0,
    eventTime: Date.now()
  });

  // Send message to popup if open
  chrome.runtime.sendMessage({
    type: 'securityUpdate',
    data: securityInfo
  });
}

// Store domain result
async function storeDomainResult(securityInfo) {
  const { domainHistory } = await chrome.storage.local.get('domainHistory');
  const updatedHistory = [securityInfo, ...(domainHistory || [])].slice(0, 100);
  await chrome.storage.local.set({ domainHistory: updatedHistory });
}

// Setup periodic tasks
function setupAlarms() {
  chrome.alarms.create('updateMaliciousDomains', { periodInMinutes: 1440 }); // Daily
}

// Update malicious domains list (mock)
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'updateMaliciousDomains') {
    // In a real extension, this would fetch from an API
    console.log('Updating malicious domains list...');
  }
});