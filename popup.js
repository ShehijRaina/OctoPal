// Popup script for OctoPal

// Elements
const botLikelihoodBar = document.getElementById('bot-likelihood');
const botLikelihoodValue = document.getElementById('bot-value');
const misinfoLikelihoodBar = document.getElementById('misinfo-likelihood');
const misinfoLikelihoodValue = document.getElementById('misinfo-value');
const reportButton = document.getElementById('report-button');
const shareButton = document.getElementById('share-button');
const rewardsBox = document.getElementById('rewards-box');
const tabs = document.querySelectorAll('.tab');
const contentSections = document.querySelectorAll('#leaderboard, #badges, #challenges');

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
  
  // Setup share button
  shareButton.addEventListener('click', function() {
    shareAnalysis();
  });
  
  // Setup tabs
  setupTabs();
});

// Tab functionality
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Hide all content sections
      contentSections.forEach(section => {
        section.style.display = 'none';
      });
      
      // Show content section for active tab
      const tabName = tab.getAttribute('data-tab');
      if (tabName === 'analysis') {
        document.querySelector('.content').style.display = 'block';
      } else {
        document.querySelector('.content').style.display = 'none';
        document.getElementById(tabName).style.display = 'block';
      }
    });
  });
}

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
  
  // Show/hide action buttons
  reportButton.disabled = false;
  shareButton.disabled = false;
}

// Show error message
function showError() {
  botLikelihoodValue.textContent = 'Error analyzing content';
  misinfoLikelihoodValue.textContent = 'Error analyzing content';
  reportButton.disabled = true;
  shareButton.disabled = true;
}

// Show not supported message
function showNotSupported() {
  botLikelihoodValue.textContent = 'Not a supported platform';
  misinfoLikelihoodValue.textContent = 'Visit Twitter/X to use OctoPal';
  reportButton.disabled = true;
  shareButton.disabled = true;
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
          // Show success message in a more visually appealing way
          rewardsBox.style.display = 'block';
          document.getElementById('reward-details').textContent = 'Report submitted successfully!';
          
          // Hide the success message after 3 seconds
          setTimeout(() => {
            rewardsBox.style.display = 'none';
          }, 3000);
        } else {
          // Show error message
          rewardsBox.style.display = 'block';
          rewardsBox.style.background = '#fff0f0';
          rewardsBox.style.border = '1px dashed #ff6b6b';
          document.getElementById('reward-details').textContent = 'Error submitting report. Please try again.';
          
          // Hide the error message after 3 seconds
          setTimeout(() => {
            rewardsBox.style.display = 'none';
          }, 3000);
        }
      });
    }
  });
}

// Share analysis
function shareAnalysis() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      const botScore = botLikelihoodBar.style.width.replace('%', '');
      const misinfoScore = misinfoLikelihoodBar.style.width.replace('%', '');
      
      const shareText = `I found content with ${botScore}% bot likelihood and ${misinfoScore}% misinformation likelihood using OctoPal! Check it out: ${tabs[0].url}`;
      
      // Open a new tab with the share text ready to tweet
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      chrome.tabs.create({ url: tweetUrl });
    }
  });
} 