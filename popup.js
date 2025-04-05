// Popup script for BotSpotter

// Elements
const botLikelihoodBar = document.getElementById('bot-likelihood');
const botLikelihoodValue = document.getElementById('bot-value');
const misinfoLikelihoodBar = document.getElementById('misinfo-likelihood');
const misinfoLikelihoodValue = document.getElementById('misinfo-value');
const reportButton = document.getElementById('report-button');

// When popup opens, get current tab and analyze
document.addEventListener('DOMContentLoaded', function() {
  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // If we have a tab and it's Twitter/X
    if (tabs[0] && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
      // Send message to content script to analyze current page
      chrome.tabs.sendMessage(tabs[0].id, {action: "analyze"}, function(response) {
        if (response && response.success) {
          updateUI(response.botScore, response.misinfoScore);
        } else {
          showError();
        }
      });
    } else {
      showNotSupported();
    }
  });
  
  // Setup report button
  reportButton.addEventListener('click', function() {
    reportContent();
  });
});

// Update UI with scores
function updateUI(botScore, misinfoScore) {
  // Update bot likelihood
  botLikelihoodBar.style.width = botScore + '%';
  botLikelihoodValue.textContent = botScore + '% likelihood of bot activity';
  
  // Set color based on risk level
  if (botScore < 30) {
    botLikelihoodBar.className = 'progress bot-low';
  } else if (botScore < 70) {
    botLikelihoodBar.className = 'progress bot-medium';
  } else {
    botLikelihoodBar.className = 'progress bot-high';
  }
  
  // Update misinfo likelihood
  misinfoLikelihoodBar.style.width = misinfoScore + '%';
  misinfoLikelihoodValue.textContent = misinfoScore + '% likelihood of misinformation';
  
  // Set color based on risk level
  if (misinfoScore < 30) {
    misinfoLikelihoodBar.className = 'progress bot-low';
  } else if (misinfoScore < 70) {
    misinfoLikelihoodBar.className = 'progress bot-medium';
  } else {
    misinfoLikelihoodBar.className = 'progress bot-high';
  }
}

// Show error message
function showError() {
  botLikelihoodValue.textContent = 'Error analyzing content';
  misinfoLikelihoodValue.textContent = 'Error analyzing content';
}

// Show not supported message
function showNotSupported() {
  botLikelihoodValue.textContent = 'Not a supported platform';
  misinfoLikelihoodValue.textContent = 'Visit Twitter/X to use BotSpotter';
  reportButton.disabled = true;
}

// Report content
function reportContent() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.runtime.sendMessage({
        action: "report",
        url: tabs[0].url,
        title: tabs[0].title
      }, function(response) {
        if (response && response.success) {
          alert('Thank you for your report!');
        } else {
          alert('Error submitting report. Please try again.');
        }
      });
    }
  });
} 