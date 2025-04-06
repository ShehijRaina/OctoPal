// Popup script for OctoPal

// Elements
const botLikelihoodBar = document.getElementById('bot-likelihood');
const botLikelihoodValue = document.getElementById('bot-likelihood-value');
const misinfoLikelihoodBar = document.getElementById('misinfo-likelihood');
const misinfoLikelihoodValue = document.getElementById('misinfo-likelihood-value');
const reportButton = document.getElementById('report-button');
const shareButton = document.getElementById('share-button');
const rewardsBox = document.getElementById('rewards-notification');
const tabs = document.querySelectorAll('.tab');
const contentSections = document.querySelectorAll('#leaderboard, #badges, #challenges');
const googleFactCheck = document.getElementById('google-fact-check');
const loadingIndicator = document.getElementById('loading-indicator');
const analysisContainer = document.getElementById('analysis-container');

// User stats elements
const userPointsElement = document.getElementById('user-points');
const userReportsElement = document.getElementById('user-reports');
const userLevelElement = document.getElementById('user-level');

// DOM elements for tabs
const analysisTab = document.getElementById('analysis-tab');
const badgesTab = document.getElementById('badges-tab');
const challengesTab = document.getElementById('challenges-tab');
const leaderboardTab = document.getElementById('leaderboard-tab');

const analysisContent = document.getElementById('analysis-content');
const badgesContent = document.getElementById('badges-content');
const challengesContent = document.getElementById('challenges-content');
const leaderboardContent = document.getElementById('leaderboard-content');

// UI elements for showing analysis results
const loadingSpinner = document.getElementById('loading-spinner');
const analysisResults = document.getElementById('analysis-results');
const notTwitterMessage = document.getElementById('not-twitter-message');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

// Helper function to format dates
function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Tab switching functionality
function switchTab(activeTab) {
  // Remove active class from all tabs and content
  [analysisTab, badgesTab, challengesTab, leaderboardTab].forEach(tab => {
    tab.classList.remove('active');
  });
  
  [analysisContent, badgesContent, challengesContent, leaderboardContent].forEach(content => {
    content.classList.remove('active');
  });
  
  // Add active class to selected tab and content
  activeTab.classList.add('active');
  
  // Show corresponding content
  if (activeTab === analysisTab) {
    analysisContent.classList.add('active');
  } else if (activeTab === badgesTab) {
    badgesContent.classList.add('active');
    // Load badges if not already loaded
    if (!badgesContent.dataset.loaded) {
      loadBadges();
      badgesContent.dataset.loaded = 'true';
    }
  } else if (activeTab === challengesTab) {
    challengesContent.classList.add('active');
    // Load challenges if not already loaded
    if (!challengesContent.dataset.loaded) {
      loadChallenges();
      challengesContent.dataset.loaded = 'true';
    }
  } else if (activeTab === leaderboardTab) {
    leaderboardContent.classList.add('active');
    // Load leaderboard if not already loaded
    if (!leaderboardContent.dataset.loaded) {
      loadLeaderboard();
      leaderboardContent.dataset.loaded = 'true';
    }
  }
}

// Update UI with scores
function updateUI(botScore, misinfoScore, postingFrequencyScore, hashtagPatternScore, detectedPatterns, accountAgeData, hashtagInsights, languagePatterns, passiveVoiceExamples, googleFactResponse, sourceCredibilityScore, sourceDetails) {
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
    
    // Award points for passive voice detection
    chrome.runtime.sendMessage({
      action: "awardPoints",
      pointType: "PASSIVE_VOICE_DETECTED",
      amount: passiveVoiceExamples.length * 5, // 5 points per example
      details: { examples: passiveVoiceExamples.length }
    }, function(response) {
      if (response && response.success) {
        // Update points display
        if (userPointsElement) {
          userPointsElement.textContent = response.totalPoints;
        }
        
        // Show point reward notification
        rewardsBox.style.display = 'block';
        document.getElementById('reward-details').textContent = `+${response.pointsAwarded} points for passive voice detection!`;
        
        // Hide after 3 seconds
        setTimeout(() => {
          rewardsBox.style.display = 'none';
        }, 3000);
      }
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
  
  // Display source credibility information if available
  if (sourceDetails && sourceDetails.length > 0) {
    // Award points for source validation
    chrome.runtime.sendMessage({
      action: "awardPoints",
      pointType: "SOURCE_VALIDATED",
      amount: sourceDetails.length * 5, // 5 points per source
      details: { sources: sourceDetails.length }
    }, function(response) {
      if (response && response.success) {
        // Update points display
        if (userPointsElement) {
          userPointsElement.textContent = response.totalPoints;
        }
        
        // Show point reward notification
        rewardsBox.style.display = 'block';
        document.getElementById('reward-details').textContent = `+${response.pointsAwarded} points for checking ${sourceDetails.length} sources!`;
        
        // Hide after 3 seconds
        setTimeout(() => {
          rewardsBox.style.display = 'none';
        }, 3000);
      }
    });
    
    // Check for low credibility sources
    const lowCredibilitySources = sourceDetails.filter(source => source.score < 40);
    if (lowCredibilitySources.length > 0) {
      chrome.runtime.sendMessage({
        action: "awardPoints",
        pointType: "LOW_CREDIBILITY_SOURCE_IDENTIFIED",
        amount: lowCredibilitySources.length * 5, // 5 points per low credibility source
        details: { lowCredSources: lowCredibilitySources.length }
      });
    }
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
  
  // Award points for bot detection if the score is high
  if (botScore >= 70) {
    // Award points for detecting a potential bot
    chrome.runtime.sendMessage({
      action: "awardPoints",
      pointType: "BOT_DETECTED",
      details: { botScore: botScore }
    }, function(response) {
      if (response && response.success) {
        // Update points display
        if (userPointsElement) {
          userPointsElement.textContent = response.totalPoints;
        }
        
        // Show point reward notification
        rewardsBox.style.display = 'block';
        document.getElementById('reward-details').textContent = `+${response.pointsAwarded} points for bot detection!`;
        
        // Hide after 3 seconds
        setTimeout(() => {
          rewardsBox.style.display = 'none';
        }, 3000);
      }
    });
  }
  
  // Award points for misinformation detection if the score is high
  if (misinfoScore >= 70) {
    // Award points for detecting potential misinformation
    chrome.runtime.sendMessage({
      action: "awardPoints",
      pointType: "MISINFO_FLAGGED",
      details: { misinfoScore: misinfoScore }
    }, function(response) {
      if (response && response.success) {
        // Update points display 
        if (userPointsElement) {
          userPointsElement.textContent = response.totalPoints;
        }
        
        // Show point reward notification
        rewardsBox.style.display = 'block';
        document.getElementById('reward-details').textContent = `+${response.pointsAwarded} points for identifying misinformation!`;
        
        // Hide after 3 seconds
        setTimeout(() => {
          rewardsBox.style.display = 'none';
        }, 3000);
      }
    });
  }
  
  // Show/hide action buttons
  reportButton.disabled = false;
  shareButton.disabled = false;
}

// Show error message
function showError(message) {
  // Hide loading and results, show error container
  loadingSpinner.style.display = 'none';
  analysisResults.style.display = 'none';
  notTwitterMessage.style.display = 'none';
  errorContainer.style.display = 'block';
  
  // Format common error messages to be more user-friendly
  let displayMessage = message || 'An error occurred during analysis.';
  
  if (message) {
    if (message.includes('communicating with the page')) {
      displayMessage = 'Error communicating with Twitter/X. Please refresh the page and try again.';
    } else if (message.includes('No tweets found')) {
      displayMessage = 'No tweets found on this page. Try scrolling down to load some tweets.';
    } else if (message.includes('not authorized')) {
      displayMessage = 'Unable to access Twitter content. Please ensure you\'re logged in.';
    } else if (message.includes('runtime')) {
      displayMessage = 'Extension runtime error. Please try reloading the extension.';
    }
  }
  
  // Set error message text
  errorMessage.textContent = displayMessage;
  
  // Disable action buttons when there's an error
  reportButton.disabled = true;
  shareButton.disabled = true;
  
  // Add a reload button
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Reload Analysis';
  reloadButton.className = 'action-button';
  reloadButton.style.marginTop = '10px';
  reloadButton.addEventListener('click', () => {
    // Clear the error and retry
    errorContainer.style.display = 'none';
    loadingSpinner.style.display = 'block';
    setTimeout(refreshUI, 500); // Retry after half a second
  });
  
  // Clear any existing button before adding
  const existingButton = errorContainer.querySelector('button');
  if (existingButton) {
    errorContainer.removeChild(existingButton);
  }
  
  // Add the reload button to the error container
  errorContainer.appendChild(reloadButton);
  
  // Log error to console for debugging
  console.error('OctoPal Error:', message);
}

// Load user stats from background script
function loadUserStats() {
  chrome.runtime.sendMessage({ action: "getUserStats" }, function(response) {
    if (response && response.success) {
      // Update points
      if (userPointsElement && response.points) {
        userPointsElement.textContent = response.points.total || 0;
      }
      
      // Update reports
      if (userReportsElement && response.userStats) {
        userReportsElement.textContent = response.userStats.reportsSubmitted || 0;
      }
      
      // Update level
      if (userLevelElement && response.level) {
        userLevelElement.textContent = response.level.title || 'Novice Detective';
      }
    } else {
      console.error("Failed to load user stats:", response ? response.error : "Unknown error");
    }
  });
}

// Load badges data
function loadBadges() {
  chrome.runtime.sendMessage({ action: "getBadges" }, function(response) {
    if (response && response.success) {
      displayBadges(response.allBadges, response.badges.earned);
    } else {
      console.error("Failed to load badges:", response ? response.error : "Unknown error");
    }
  });
}

// Display badges in the UI
function displayBadges(allBadges, earnedBadges) {
  const earnedBadgesContainer = document.getElementById('earned-badges');
  const badgesToEarnContainer = document.getElementById('badges-to-earn');
  const recentBadgesContainer = document.getElementById('recent-badges');
  const noEarnedBadgesMsg = document.getElementById('no-earned-badges');
  const noRecentBadgesMsg = document.getElementById('no-recent-badges');
  
  // Clear existing content
  earnedBadgesContainer.innerHTML = '';
  badgesToEarnContainer.innerHTML = '';
  recentBadgesContainer.innerHTML = '';
  
  // Get badge progress data
  chrome.runtime.sendMessage({ action: "getBadgeProgress" }, function(response) {
    if (response && response.success) {
      const badgeProgress = response.badgeProgress || {};
      const earnedDates = response.earnedDates || {};
      
      // Keep track of recent badges
      const recentBadges = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (!earnedBadges || earnedBadges.length === 0) {
        noEarnedBadgesMsg.style.display = 'block';
        noRecentBadgesMsg.style.display = 'block';
      } else {
        noEarnedBadgesMsg.style.display = 'none';
        
        // Add each earned badge
        earnedBadges.forEach(badgeId => {
          // Find the badge details from allBadges
          const badge = Object.values(allBadges).find(b => b.id === badgeId);
          if (badge) {
            const earnedDate = earnedDates[badgeId] ? new Date(earnedDates[badgeId]) : null;
            const badgeElement = createBadgeElement(badge, true, 100, earnedDates[badgeId]);
            earnedBadgesContainer.appendChild(badgeElement);
            
            // Check if this is a recent badge (earned in the last 7 days)
            if (earnedDate && earnedDate > sevenDaysAgo) {
              recentBadges.push({badge, earnedDate});
            }
          }
        });
        
        // Display recent badges
        if (recentBadges.length > 0) {
          noRecentBadgesMsg.style.display = 'none';
          
          // Sort recent badges by date (newest first)
          recentBadges.sort((a, b) => b.earnedDate - a.earnedDate);
          
          // Display up to 3 recent badges
          recentBadges.slice(0, 3).forEach(({badge, earnedDate}) => {
            const badgeElement = createBadgeElement(badge, true, 100, earnedDate.toISOString());
            badgeElement.classList.add('recent-badge');
            recentBadgesContainer.appendChild(badgeElement);
          });
        } else {
          noRecentBadgesMsg.style.display = 'block';
        }
      }
      
      // Add badges that can be earned
      Object.values(allBadges).forEach(badge => {
        if (!earnedBadges || !earnedBadges.includes(badge.id)) {
          // Calculate progress percentage
          const progress = badgeProgress[badge.type] || 0;
          const progressPercent = Math.min(100, Math.round((progress / badge.requirement) * 100));
          
          const badgeElement = createBadgeElement(badge, false, progressPercent, null, progress);
          badgesToEarnContainer.appendChild(badgeElement);
        }
      });
    }
  });
}

// Create a badge element for display
function createBadgeElement(badge, earned, progressPercent, earnedDate, currentProgress) {
  const badgeElement = document.createElement('div');
  badgeElement.className = earned ? 'badge-item earned' : 'badge-item';
  
  const iconElement = document.createElement('div');
  iconElement.className = 'badge-icon';
  iconElement.textContent = badge.icon;
  
  const nameElement = document.createElement('div');
  nameElement.className = 'badge-name';
  nameElement.textContent = badge.name;
  
  const descElement = document.createElement('div');
  descElement.className = 'badge-description';
  descElement.textContent = badge.description;
  
  badgeElement.appendChild(iconElement);
  badgeElement.appendChild(nameElement);
  badgeElement.appendChild(descElement);
  
  // Add progress bar for unearned badges
  if (!earned) {
    const progressText = document.createElement('div');
    progressText.className = 'badge-progress-text';
    progressText.textContent = `Progress: ${currentProgress || 0}/${badge.requirement} (${progressPercent}%)`;
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'badge-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'badge-progress-bar';
    progressBar.style.width = `${progressPercent}%`;
    
    progressContainer.appendChild(progressBar);
    
    badgeElement.appendChild(progressText);
    badgeElement.appendChild(progressContainer);
  } else if (earnedDate) {
    // Add earned date for earned badges
    const earnedDateElement = document.createElement('div');
    earnedDateElement.className = 'badge-earned-date';
    
    // Format the date nicely
    const dateObj = new Date(earnedDate);
    const formattedDate = dateObj.toLocaleDateString();
    
    earnedDateElement.textContent = `Earned on: ${formattedDate}`;
    badgeElement.appendChild(earnedDateElement);
  }
  
  return badgeElement;
}

// Load challenges
function loadChallenges() {
  chrome.runtime.sendMessage({ action: "getChallenges" }, function(response) {
    if (response && response.success) {
      // For daily challenges
      if (response.challenges && response.challenges.active && response.challenges.active.daily) {
        const dailyChallenges = [response.challenges.active.daily];
        const dailyProgress = response.challenges.dailyProgress || {};
        displayChallenges(dailyChallenges, dailyProgress, 'daily-challenges');
      }
      
      // For weekly challenges
      if (response.challenges && response.challenges.active && response.challenges.active.weekly) {
        const weeklyChallenges = [response.challenges.active.weekly];
        const weeklyProgress = response.challenges.weeklyProgress || {};
        displayChallenges(weeklyChallenges, weeklyProgress, 'weekly-challenges');
      }
    } else {
      console.error("Failed to load challenges:", response ? response.error : "Unknown error");
    }
  });
}

// Display challenges in the UI
function displayChallenges(challenges, progressData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Add each challenge
  challenges.forEach(challenge => {
    const challengeElement = document.createElement('div');
    challengeElement.className = 'challenge-item';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'challenge-title';
    titleElement.textContent = challenge.name;
    
    const descElement = document.createElement('div');
    descElement.className = 'challenge-description';
    descElement.textContent = challenge.description;
    
    // Calculate progress
    const currentProgress = progressData[challenge.id] || 0;
    const progressPercent = Math.min(100, (currentProgress / challenge.requirement) * 100);
    
    const progressText = document.createElement('div');
    progressText.className = 'challenge-progress-text';
    progressText.textContent = `Progress: ${currentProgress}/${challenge.requirement}`;
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'challenge-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'challenge-progress-bar';
    progressBar.style.width = `${progressPercent}%`;
    
    progressContainer.appendChild(progressBar);
    
    const rewardElement = document.createElement('div');
    rewardElement.className = 'challenge-reward';
    rewardElement.innerHTML = `<span class="reward-icon">🏆</span> Reward: ${challenge.reward} points`;
    
    challengeElement.appendChild(titleElement);
    challengeElement.appendChild(descElement);
    challengeElement.appendChild(progressText);
    challengeElement.appendChild(progressContainer);
    challengeElement.appendChild(rewardElement);
    
    container.appendChild(challengeElement);
  });
}

// Load leaderboard
function loadLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  const loadingIndicator = document.getElementById('leaderboard-loading');
  const errorElement = document.getElementById('leaderboard-error');
  
  if (!leaderboardList) return;
  
  // Show loading state
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (errorElement) errorElement.style.display = 'none';
  leaderboardList.innerHTML = '';
  
  chrome.runtime.sendMessage({ action: "getLeaderboard" }, function(response) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    if (response && response.success) {
      displayLeaderboard(response.leaderboard);
    } else {
      if (errorElement) errorElement.style.display = 'block';
      console.error("Failed to load leaderboard:", response ? response.error : "Unknown error");
    }
  });
}

// Display leaderboard in the UI
function displayLeaderboard(leaderboard) {
  const leaderboardList = document.getElementById('leaderboard-list');
  if (!leaderboardList) return;
  
  // Clear existing content
  leaderboardList.innerHTML = '';
  
  // Add each user to the leaderboard
  leaderboard.forEach((user, index) => {
    const rank = user.rank || (index + 1);
    const isCurrentUser = user.name === "You";
    
    const userElement = document.createElement('div');
    userElement.className = isCurrentUser ? 'leaderboard-item current-user' : 'leaderboard-item';
    
    const rankElement = document.createElement('div');
    rankElement.className = rank <= 3 ? `rank rank-${rank}` : 'rank';
    rankElement.textContent = rank <= 3 ? '' : rank;
    
    const avatarElement = document.createElement('div');
    avatarElement.className = 'leaderboard-avatar';
    avatarElement.textContent = user.name.charAt(0).toUpperCase();
    avatarElement.style.backgroundColor = getAvatarColor(user.name);
    
    const nameElement = document.createElement('div');
    nameElement.className = 'username';
    nameElement.textContent = user.name;
    
    const pointsElement = document.createElement('div');
    pointsElement.className = 'points';
    pointsElement.textContent = `${user.points} pts`;
    
    userElement.appendChild(rankElement);
    userElement.appendChild(avatarElement);
    userElement.appendChild(nameElement);
    userElement.appendChild(pointsElement);
    
    leaderboardList.appendChild(userElement);
  });
}

// Generate a consistent color for avatar based on username
function getAvatarColor(username) {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to HSL color (better control over brightness)
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 45%)`;
}

// Refresh UI with content from current tab
function refreshUI() {
  // Show loading state
  loadingSpinner.style.display = 'block';
  analysisResults.style.display = 'none';
  notTwitterMessage.style.display = 'none';
  errorContainer.style.display = 'none';
  
  // Get current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    
    // Check if the current tab is a Twitter/X page
    if (currentTab.url.includes('twitter.com') || currentTab.url.includes('x.com')) {
      // First check if the content script is available by sending a simple ping
      chrome.tabs.sendMessage(currentTab.id, { action: "ping" }, function(pingResponse) {
        if (chrome.runtime.lastError) {
          console.log("Content script not ready, trying to inject it...");
          
          // Try to inject the content script
          chrome.scripting.executeScript({
            target: {tabId: currentTab.id},
            files: ['content.js']
          }).then(() => {
            console.log("Content script injected successfully");
            // Wait a moment for the content script to initialize
            setTimeout(() => {
              // Now try to analyze the page
              sendAnalyzeRequest(currentTab);
            }, 500);
          }).catch(err => {
            console.error("Failed to inject content script:", err);
            showError("Failed to analyze the page. Please refresh the Twitter/X page and try again.");
          });
        } else {
          // Content script is available, proceed with analysis
          sendAnalyzeRequest(currentTab);
        }
      });
    } else {
      // Not a Twitter/X page
      loadingSpinner.style.display = 'none';
      notTwitterMessage.style.display = 'block';
    }
  });
}

// Helper function to send the analyze request to the content script
function sendAnalyzeRequest(tab) {
  try {
    chrome.tabs.sendMessage(tab.id, { action: "analyze" }, function(response) {
      // Check for runtime errors after sending the message
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        showError("Error communicating with the page. Please refresh the Twitter/X page and try again.");
        return;
      }
      
      if (response && response.success) {
        // Hide loading spinner and show results
        loadingSpinner.style.display = 'none';
        analysisResults.style.display = 'block';
        
        // Update UI with scores
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
          response.googleFactResponse,
          response.sourceCredibilityScore,
          response.sourceDetails
        );
        
        // Show the ongoing analysis indicator
        const ongoingAnalysisIndicator = document.getElementById('ongoing-analysis-indicator');
        if (ongoingAnalysisIndicator) {
          ongoingAnalysisIndicator.style.display = 'flex';
        }
        
        // Set up event listeners for the action buttons
        setupActionButtons(tab, response);
      } else if (response && response.error) {
        showError(response.error);
      } else {
        showError("An unknown error occurred during analysis.");
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    showError("Failed to analyze the page. Please refresh and try again.");
  }
}

// Setup action buttons (report and share)
function setupActionButtons(tab, analysisData) {
  // Remove any existing event listeners
  reportButton.removeEventListener('click', reportContent);
  shareButton.removeEventListener('click', shareContent);
  
  // Store tab and analysis data in button attributes for access in event handlers
  reportButton.setAttribute('data-tab-url', tab.url);
  reportButton.setAttribute('data-tab-title', tab.title);
  shareButton.setAttribute('data-bot-score', analysisData.botScore);
  shareButton.setAttribute('data-misinfo-score', analysisData.misinfoScore);
  
  // Enable buttons
  reportButton.disabled = false;
  shareButton.disabled = false;
  
  // Add new event listeners
  reportButton.addEventListener('click', reportContent);
  shareButton.addEventListener('click', shareContent);
}

// Report content handler
function reportContent(event) {
  const button = event.currentTarget;
  const url = button.getAttribute('data-tab-url');
  const title = button.getAttribute('data-tab-title');
  
  chrome.runtime.sendMessage({
    action: "report",
    url: url,
    title: title
  }, function(response) {
    if (response && response.success) {
      // Update report count
      if (userReportsElement) {
        userReportsElement.textContent = parseInt(userReportsElement.textContent || 0) + 1;
      }
      
      // Show reward notification
      rewardsBox.style.display = 'block';
      document.getElementById('reward-details').textContent = `+${response.pointsAwarded} points for submitting a report!`;
      
      // Hide after 3 seconds
      setTimeout(() => {
        rewardsBox.style.display = 'none';
      }, 3000);
      
      // Disable report button to prevent multiple reports
      button.disabled = true;
    }
  });
}

// Share content handler
function shareContent(event) {
  const button = event.currentTarget;
  const botScore = button.getAttribute('data-bot-score');
  const misinfoScore = button.getAttribute('data-misinfo-score');
  
  // Generate share text
  const shareText = `I analyzed this content with OctoPal and found:
• ${botScore}% likelihood of bot activity
• ${misinfoScore}% likelihood of misinformation
Check it out yourself!`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareText).then(() => {
    // Show notification
    rewardsBox.style.display = 'block';
    document.getElementById('reward-details').textContent = 'Results copied to clipboard!';
    
    // Hide after 3 seconds
    setTimeout(() => {
      rewardsBox.style.display = 'none';
    }, 3000);
    
    // Award points for sharing
    chrome.runtime.sendMessage({
      action: "awardPoints",
      pointType: "SHARED_RESULT",
      details: { shared: true }
    }, function(response) {
      if (response && response.success && userPointsElement) {
        userPointsElement.textContent = response.totalPoints;
      }
    });
  });
}

// Initialize tabs when popup loads
function initializeTabs() {
  // Set the analysis tab as active by default
  switchTab(analysisTab);
  
  // Add event listeners to tab buttons
  analysisTab.addEventListener('click', () => switchTab(analysisTab));
  badgesTab.addEventListener('click', () => switchTab(badgesTab));
  challengesTab.addEventListener('click', () => switchTab(challengesTab));
  leaderboardTab.addEventListener('click', () => switchTab(leaderboardTab));
}

// Listen for messages from background
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "pointsUpdated") {
    // Update the points display
    if (userPointsElement) {
      userPointsElement.textContent = message.totalPoints;
    }
    
    // Show notification if there are points awarded
    if (message.pointsAwarded && message.pointsAwarded > 0) {
      // Format a nice message for the notification
      let pointsMessage = `+${message.pointsAwarded} points`;
      if (message.reason) {
        switch (message.reason) {
          case 'BOT_DETECTED':
            pointsMessage += ' for bot detection!';
            break;
          case 'MISINFO_FLAGGED':
            pointsMessage += ' for identifying misinformation!';
            break;
          case 'SOURCE_VALIDATED':
            pointsMessage += ' for validating sources!';
            break;
          case 'PASSIVE_VOICE_DETECTED':
            pointsMessage += ' for passive voice detection!';
            break;
          case 'LOW_CREDIBILITY_SOURCE_IDENTIFIED':
            pointsMessage += ' for identifying low credibility sources!';
            break;
          case 'REPORT_SUBMITTED':
            pointsMessage += ' for submitting a report!';
            break;
          case 'CHALLENGE_COMPLETED':
            pointsMessage += ' for completing a challenge!';
            break;
          case 'BADGE_EARNED':
            pointsMessage += ' for earning a badge!';
            break;
          default:
            pointsMessage += '!';
        }
      }
      
      // Show the notification
      rewardsBox.style.display = 'block';
      document.getElementById('reward-details').textContent = pointsMessage;
      
      // Hide after 3 seconds
      setTimeout(() => {
        rewardsBox.style.display = 'none';
      }, 3000);
    }
  } else if (message.action === "levelUp") {
    // Update level display
    if (userLevelElement) {
      userLevelElement.textContent = message.title;
    }
    
    // Show level up notification
    rewardsBox.style.display = 'block';
    document.getElementById('reward-details').textContent = `Level Up! You're now a ${message.title}!`;
    
    // Hide after 5 seconds (longer for level up)
    setTimeout(() => {
      rewardsBox.style.display = 'none';
    }, 5000);
  } else if (message.action === "badgeEarned") {
    // Handle badge earned notification
    const badge = message.badge;
    
    // If we're on the badges tab, refresh the badge display
    if (badgesContent.classList.contains('active')) {
      loadBadges();
    }
    
    // Show badge earned notification
    rewardsBox.style.display = 'block';
    
    // Create a more elaborate rewards notification
    const rewardDetails = document.getElementById('reward-details');
    rewardDetails.innerHTML = `
      <div class="badge-earned-notification">
        <div class="badge-icon-large">${badge.icon}</div>
        <div class="badge-earned-text">
          <div class="badge-title">New Badge Earned!</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-desc">${badge.description}</div>
        </div>
      </div>
    `;
    
    // Hide after 5 seconds
    setTimeout(() => {
      rewardsBox.style.display = 'none';
    }, 5000);
  } else if (message.action === "analysisUpdated") {
    // Handle updated analysis results from content script
    console.log("OctoPal: Received updated analysis from content script");
    
    // Only update if we're currently showing analysis results
    if (analysisResults.style.display === 'block') {
      // Show a brief notification that analysis has been updated
      const analysisUpdateNotice = document.createElement('div');
      analysisUpdateNotice.className = 'analysis-update-notice';
      analysisUpdateNotice.textContent = '🔄 Analysis updated with new tweets';
      
      // Add the notice to the DOM
      const mainContent = document.getElementById('main-content');
      mainContent.appendChild(analysisUpdateNotice);
      
      // Remove the notice after 2 seconds
      setTimeout(() => {
        mainContent.removeChild(analysisUpdateNotice);
      }, 2000);
      
      // Update the UI with the new results
      if (message.results) {
        updateUI(
          message.results.botScore,
          message.results.misinfoScore,
          message.results.postingFrequencyScore,
          message.results.hashtagPatternScore,
          message.results.detectedPatterns,
          message.results.accountAgeData,
          message.results.hashtagInsights,
          message.results.languagePatterns,
          message.results.passiveVoiceExamples,
          message.results.googleFactResponse,
          message.results.sourceCredibilityScore,
          message.results.sourceDetails
        );
      }
    }
    
    // Always respond to let the content script know we received the message
    sendResponse({ success: true });
    return true;
  }
});

// Initialize UI when popup is opened
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tabs
  initializeTabs();
  
  // Load user stats
  loadUserStats();
  
  // Load analysis data for the current page
  refreshUI();
}); 