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
const googleFactCheck = document.getElementById('google_factcheck');
const loadingIndicator = document.getElementById('loading-indicator');
const analysisContainer = document.getElementById('analysis-container');


// When popup opens, get current tab and analyze
document.addEventListener('DOMContentLoaded', function() {
  refreshUI();
});

function refreshUI() {
  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // If we have a tab and it's Twitter/X
    if (tabs[0] && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
      try {
        // Send message to content script to analyze current page
        chrome.tabs.sendMessage(tabs[0].id, {action: "analyze"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error("OctoPal: Runtime error:", chrome.runtime.lastError);
            showError("Connection error: " + chrome.runtime.lastError.message);
            return;
          }
          
          if (response && response.success) {
            updateUI(
              response.botScore,
              response.misinfoScore,
              response.postingFrequencyScore,
              response.hashtagPatternScore,
              response.detectedPatterns,
              response.accountAgeData,
              response.hashtagInsights,
              response.languagePatterns,
              response.passiveVoiceExamples,
              response.googleFactResponse
            );
          } else {
            let errorMsg = "Unknown error";
            if (response && response.error) {
              console.error("OctoPal: Analysis error:", response.error);
              errorMsg = response.error;
            }
            showError(errorMsg);
          }
        });
      } catch (err) {
        console.error("OctoPal: Exception in popup:", err);
        showError("Exception: " + err.message);
      }
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
}

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
function updateUI(botScore, misinfoScore, postingFrequencyScore, hashtagPatternScore, detectedPatterns, accountAgeData, hashtagInsights, languagePatterns, passiveVoiceExamples, googleFactResponse) {
  // Update bot likelihood
  botLikelihoodBar.style.width = botScore + '%';
  botLikelihoodValue.textContent = botScore + '% likelihood of bot activity';
  
  // Update Google fact-check text if provided
  if (googleFactCheck && googleFactResponse) {
    googleFactCheck.textContent = googleFactResponse;
  }
  
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
  
  // Add posting frequency info if the element exists
  const postingFrequencyBar = document.getElementById('posting-frequency');
  const postingFrequencyValue = document.getElementById('posting-frequency-value');
  
  if (postingFrequencyBar && postingFrequencyValue) {
    postingFrequencyBar.style.width = postingFrequencyScore + '%';
    postingFrequencyValue.textContent = postingFrequencyScore + '% suspicious posting patterns';
    
    // Set color based on risk level
    if (postingFrequencyScore < 30) {
      postingFrequencyBar.className = 'progress bot-low';
    } else if (postingFrequencyScore < 70) {
      postingFrequencyBar.className = 'progress bot-medium';
    } else {
      postingFrequencyBar.className = 'progress bot-high';
    }
  }
  
  // Add hashtag pattern info if the element exists
  const hashtagPatternBar = document.getElementById('hashtag-pattern');
  const hashtagPatternValue = document.getElementById('hashtag-pattern-value');
  
  if (hashtagPatternBar && hashtagPatternValue) {
    hashtagPatternBar.style.width = hashtagPatternScore + '%';
    hashtagPatternValue.textContent = hashtagPatternScore + '% suspicious hashtag patterns';
    
    // Set color based on risk level
    if (hashtagPatternScore < 30) {
      hashtagPatternBar.className = 'progress bot-low';
    } else if (hashtagPatternScore < 70) {
      hashtagPatternBar.className = 'progress bot-medium';
    } else {
      hashtagPatternBar.className = 'progress bot-high';
    }
  }
  
  // Display passive voice examples if available
  const passiveVoiceContainer = document.getElementById('passive-voice-container');
  const passiveExamplesList = document.getElementById('passive-examples-list');
  
  if (passiveVoiceContainer && passiveExamplesList && passiveVoiceExamples && passiveVoiceExamples.length > 0) {
    // Clear existing examples
    passiveExamplesList.innerHTML = '';
    
    // Show the container
    passiveVoiceContainer.style.display = 'block';
    
    // Add each passive voice example
    passiveVoiceExamples.forEach(example => {
      const exampleItem = document.createElement('li');
      exampleItem.textContent = `"${example}"`;
      passiveExamplesList.appendChild(exampleItem);
    });
  } else if (passiveVoiceContainer) {
    passiveVoiceContainer.style.display = 'none';
  }
  
  // Display detected language patterns if available
  const languagePatternsContainer = document.getElementById('language-patterns');
  const languagePatternsList = document.getElementById('language-patterns-list');
  
  if (languagePatternsContainer && languagePatternsList && languagePatterns && languagePatterns.length > 0) {
    // Clear existing patterns
    languagePatternsList.innerHTML = '';
    
    // Show the container
    languagePatternsContainer.style.display = 'block';
    
    // Add each language pattern
    languagePatterns.forEach(pattern => {
      const patternItem = document.createElement('li');
      patternItem.textContent = pattern;
      languagePatternsList.appendChild(patternItem);
    });
  } else if (languagePatternsContainer) {
    languagePatternsContainer.style.display = 'none';
  }
  
  // Display detected patterns if element exists
  const patternsContainer = document.getElementById('detected-patterns');
  if (patternsContainer && detectedPatterns && detectedPatterns.length > 0) {
    patternsContainer.innerHTML = '';
    patternsContainer.style.display = 'block';
    
    const patternTitle = document.createElement('h4');
    patternTitle.textContent = 'Detected Patterns:';
    patternsContainer.appendChild(patternTitle);
    
    const patternList = document.createElement('ul');
    patternList.className = 'pattern-list';
    
    detectedPatterns.forEach(pattern => {
      const item = document.createElement('li');
      item.textContent = pattern;
      patternList.appendChild(item);
    });
    
    patternsContainer.appendChild(patternList);
  } else if (patternsContainer) {
    patternsContainer.style.display = 'none';
  }
  
  // Display account age information if available
  const accountAgeContainer = document.getElementById('account-age-info');
  if (accountAgeContainer && accountAgeData && accountAgeData.length > 0) {
    accountAgeContainer.innerHTML = '';
    accountAgeContainer.style.display = 'block';
    
    const ageTitle = document.createElement('h4');
    ageTitle.textContent = 'Account Age Information:';
    accountAgeContainer.appendChild(ageTitle);
    
    const ageList = document.createElement('ul');
    ageList.className = 'account-age-list';
    
    accountAgeData.forEach(account => {
      const item = document.createElement('li');
      
      // Format the account age in a human-readable way
      let ageText = '';
      if (account.accountAgeInDays < 30) {
        ageText = `${account.accountAgeInDays} days old`;
      } else if (account.accountAgeInDays < 365) {
        ageText = `${Math.round(account.accountAgeInDays / 30)} months old`;
      } else {
        ageText = `${Math.round(account.accountAgeInDays / 365)} years old`;
      }
      
      // Assign a risk level based on the age score
      let riskLevel = '';
      if (account.ageScore >= 20) {
        riskLevel = '<span class="high-risk">High Risk</span>';
      } else if (account.ageScore >= 10) {
        riskLevel = '<span class="medium-risk">Medium Risk</span>';
      } else if (account.ageScore > 0) {
        riskLevel = '<span class="low-risk">Low Risk</span>';
      } else {
        riskLevel = '<span class="no-risk">No Risk</span>';
      }
      
      item.innerHTML = `<strong>${account.username}</strong>: ${ageText} (joined ${account.joinDate}) ${riskLevel}`;
      ageList.appendChild(item);
    });
    
    accountAgeContainer.appendChild(ageList);
  } else if (accountAgeContainer) {
    accountAgeContainer.style.display = 'none';
  }
  
  // Display hashtag insights if available
  const hashtagInsightsContainer = document.getElementById('hashtag-insights');
  if (hashtagInsightsContainer && hashtagInsights && hashtagInsights.length > 0) {
    hashtagInsightsContainer.innerHTML = '';
    hashtagInsightsContainer.style.display = 'block';
    
    const insightsTitle = document.createElement('h4');
    insightsTitle.textContent = 'Hashtag Analysis:';
    hashtagInsightsContainer.appendChild(insightsTitle);
    
    const insightsList = document.createElement('ul');
    insightsList.className = 'hashtag-insights-list';
    
    hashtagInsights.forEach(insight => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="high-risk">⚠️</span> ${insight}`;
      insightsList.appendChild(item);
    });
    
    hashtagInsightsContainer.appendChild(insightsList);
  } else if (hashtagInsightsContainer) {
    hashtagInsightsContainer.style.display = 'none';
  }
  
  // Show/hide action buttons
  reportButton.disabled = false;
  shareButton.disabled = false;
}

// Show error message
function showError(errorMsg = "Error analyzing content") {
  botLikelihoodValue.textContent = errorMsg;
  misinfoLikelihoodValue.textContent = 'Try refreshing the page';
  
  const postingFrequencyValue = document.getElementById('posting-frequency-value');
  if (postingFrequencyValue) {
    postingFrequencyValue.textContent = 'Error analyzing content';
  }
  
  const patternsContainer = document.getElementById('detected-patterns');
  if (patternsContainer) {
    patternsContainer.style.display = 'none';
  }
  
  const accountAgeContainer = document.getElementById('account-age-info');
  if (accountAgeContainer) {
    accountAgeContainer.style.display = 'none';
  }
  
  const hashtagPatternValue = document.getElementById('hashtag-pattern-value');
  if (hashtagPatternValue) {
    hashtagPatternValue.textContent = 'Error analyzing content';
  }
  
  const hashtagInsightsContainer = document.getElementById('hashtag-insights');
  if (hashtagInsightsContainer) {
    hashtagInsightsContainer.style.display = 'none';
  }
  
  const languagePatternsContainer = document.getElementById('language-patterns');
  if (languagePatternsContainer) {
    languagePatternsContainer.style.display = 'none';
  }
  
  const passiveVoiceContainer = document.getElementById('passive-voice-container');
  if (passiveVoiceContainer) {
    passiveVoiceContainer.style.display = 'none';
  }
  
  reportButton.disabled = true;
  shareButton.disabled = true;
}

// Show not supported message
function showNotSupported() {
  botLikelihoodValue.textContent = 'Not a supported platform';
  misinfoLikelihoodValue.textContent = 'Visit Twitter/X to use OctoPal';
  
  const postingFrequencyValue = document.getElementById('posting-frequency-value');
  if (postingFrequencyValue) {
    postingFrequencyValue.textContent = 'Not a supported platform';
  }
  
  const patternsContainer = document.getElementById('detected-patterns');
  if (patternsContainer) {
    patternsContainer.style.display = 'none';
  }
  
  const accountAgeContainer = document.getElementById('account-age-info');
  if (accountAgeContainer) {
    accountAgeContainer.style.display = 'none';
  }
  
  const hashtagPatternValue = document.getElementById('hashtag-pattern-value');
  if (hashtagPatternValue) {
    hashtagPatternValue.textContent = 'Not a supported platform';
  }
  
  const hashtagInsightsContainer = document.getElementById('hashtag-insights');
  if (hashtagInsightsContainer) {
    hashtagInsightsContainer.style.display = 'none';
  }
  
  const languagePatternsContainer = document.getElementById('language-patterns');
  if (languagePatternsContainer) {
    languagePatternsContainer.style.display = 'none';
  }
  
  const passiveVoiceContainer = document.getElementById('passive-voice-container');
  if (passiveVoiceContainer) {
    passiveVoiceContainer.style.display = 'none';
  }
  
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
      
      // Add posting frequency score if available
      let shareText = `I found content with ${botScore}% bot likelihood and ${misinfoScore}% misinformation likelihood`;
      
      const postingFrequencyBar = document.getElementById('posting-frequency');
      if (postingFrequencyBar) {
        const postingFrequencyScore = postingFrequencyBar.style.width.replace('%', '');
        shareText += ` and ${postingFrequencyScore}% suspicious posting patterns`;
      }
      
      const hashtagPatternBar = document.getElementById('hashtag-pattern');
      if (hashtagPatternBar) {
        const hashtagPatternScore = hashtagPatternBar.style.width.replace('%', '');
        shareText += `, ${hashtagPatternScore}% suspicious hashtag usage`;
      }
      
      shareText += ` using OctoPal! Check it out: ${tabs[0].url}`;
      
      // Open a new tab with the share text ready to tweet
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      chrome.tabs.create({ url: tweetUrl });
    }
  });
} 