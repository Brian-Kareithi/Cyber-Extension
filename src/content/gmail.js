// Wait for Gmail to load
const observer = new MutationObserver((mutations, obs) => {
  const emailList = document.querySelector('[role="main"] [role="list"]');
  if (emailList) {
    obs.disconnect();
    monitorEmails();
  }
});

observer.observe(document, {
  childList: true,
  subtree: true
});

// Monitor emails in inbox
function monitorEmails() {
  const emailList = document.querySelector('[role="main"] [role="list"]');
  
  if (!emailList) return;

  const emailObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        processEmails();
      }
    });
  });

  emailObserver.observe(emailList, {
    childList: true,
    subtree: true
  });

  // Initial processing
  processEmails();
}

// Process all visible emails
function processEmails() {
  const emails = document.querySelectorAll('[role="listitem"]');
  
  emails.forEach(email => {
    const subjectElement = email.querySelector('[data-legacy-thread-id] span');
    if (!subjectElement || email.dataset.processedBySecurityAssistant) return;
    
    email.dataset.processedBySecurityAssistant = 'true';
    const subject = subjectElement.textContent.trim();
    const isSpam = classifyEmail(subject);
    
    markEmail(email, isSpam);
    storeEmailResult(subject, isSpam);
  });
}

// Classify email as spam or not (mock AI)
function classifyEmail(subject) {
  // Simple heuristic-based classification
  const spamKeywords = [
    'urgent', 'action required', 'account suspended', 'password reset',
    'verify your account', 'limited offer', 'you won', 'free', 'congratulations',
    'click here', 'bank', 'paypal', 'security alert'
  ];
  
  const lowerSubject = subject.toLowerCase();
  const spamScore = spamKeywords.reduce((score, keyword) => {
    return score + (lowerSubject.includes(keyword) ? 1 : 0);
  }, 0);
  
  return spamScore >= 2;
}

// Mark email in UI
function markEmail(emailElement, isSpam) {
  const existingBadge = emailElement.querySelector('.security-badge');
  if (existingBadge) existingBadge.remove();
  
  const badge = document.createElement('div');
  badge.className = `security-badge ${isSpam ? 'spam' : 'safe'}`;
  badge.textContent = isSpam ? 'SPAM' : 'SAFE';
  badge.style.cssText = `
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    color: white;
    background-color: ${isSpam ? '#ef4444' : '#10b981'};
    z-index: 1000;
  `;
  
  emailElement.style.position = 'relative';
  emailElement.appendChild(badge);
}

function storeEmailResult(subject, isSpam) {
  chrome.runtime.sendMessage({
    type: 'emailResult',
    data: {
      subject,
      isSpam,
      timestamp: new Date().toISOString()
    }
  });
}