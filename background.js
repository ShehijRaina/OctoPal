// OctoPal background script
console.log('OctoPal: Background script loaded');

// Badge definitions
const BADGES = {
  BOT_BUSTER: {
    id: 'bot_buster',
    name: 'Bot Buster',
    description: 'Detect 10 bot accounts',
    icon: '🤖',
    requirement: 10,
    type: 'bot_detection'
  },
  SPAM_SLAYER: {
    id: 'spam_slayer',
    name: 'Spam Slayer',
    description: 'Identify 10 accounts with high spamming behavior',
    icon: '🗑️',
    requirement: 10,
    type: 'spam_detection'
  },
  TRUTH_SEEKER: {
    id: 'truth_seeker',
    name: 'Truth Seeker',
    description: 'Flag 20 pieces of misinformation',
    icon: '🔍',
    requirement: 20,
    type: 'misinfo_flagged'
  },
  SOURCE_MASTER: {
    id: 'source_master',
    name: 'Source Master',
    description: 'Validate 15 pieces of content with reliable sources',
    icon: '📚',
    requirement: 15,
    type: 'source_validation'
  },
  DAILY_DETECTIVE: {
    id: 'daily_detective',
    name: 'Daily Detective',
    description: 'Use OctoPal for 7 consecutive days',
    icon: '📅',
    requirement: 7,
    type: 'daily_usage'
  },
  CONSISTENCY_KING: {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Use OctoPal for 30 consecutive days',
    icon: '👑',
    requirement: 30,
    type: 'daily_usage'
  },
  CHALLENGE_CHAMPION: {
    id: 'challenge_champion',
    name: 'Challenge Champion',
    description: 'Complete 5 daily challenges',
    icon: '🏆',
    requirement: 5,
    type: 'challenges_completed'
  },
  PASSIVE_DETECTOR: {
    id: 'passive_detector',
    name: 'Passive Voice Detector',
    description: 'Detect 20 instances of passive voice in tweets',
    icon: '💬',
    requirement: 20,
    type: 'passive_detected'
  },
  SOURCE_CRITIC: {
    id: 'source_critic',
    name: 'Source Critic',
    description: 'Identify 15 low-credibility sources',
    icon: '⚠️',
    requirement: 15,
    type: 'low_credibility_sources'
  }
};

// Challenge definitions
const DAILY_CHALLENGES = [
  {
    id: 'daily_bot_hunting',
    name: 'Bot Hunting',
    description: 'Detect 5 potential bot accounts today',
    reward: 50,
    requirement: 5,
    type: 'bot_detection'
  },
  {
    id: 'daily_misinfo_flagging',
    name: 'Misinformation Patrol',
    description: 'Flag 5 pieces of potential misinformation today',
    reward: 50,
    requirement: 5,
    type: 'misinfo_flagged'
  },
  {
    id: 'daily_source_checking',
    name: 'Source Check',
    description: 'Check 5 sources for credibility today',
    reward: 50,
    requirement: 5,
    type: 'source_validation'
  },
  {
    id: 'daily_passive_hunting',
    name: 'Passive Voice Hunter',
    description: 'Find 5 examples of passive voice hiding responsibility',
    reward: 50,
    requirement: 5,
    type: 'passive_detected'
  }
];

// Weekly challenges are more substantial
const WEEKLY_CHALLENGES = [
  {
    id: 'weekly_bot_network',
    name: 'Bot Network Hunter',
    description: 'Identify 20 potential bot accounts this week',
    reward: 200,
    requirement: 20,
    type: 'bot_detection'
  },
  {
    id: 'weekly_misinfo_campaign',
    name: 'Misinformation Campaign Detector',
    description: 'Flag 25 pieces of misinformation this week',
    reward: 200,
    requirement: 25,
    type: 'misinfo_flagged'
  },
  {
    id: 'weekly_daily_streak',
    name: 'Daily Detector',
    description: 'Use OctoPal for 7 consecutive days',
    reward: 150,
    requirement: 7,
    type: 'login_streak'
  }
];

// Define level thresholds
const LEVELS = [
  { level: 1, threshold: 0, title: 'Novice Detective' },
  { level: 2, threshold: 100, title: 'Apprentice Detective' },
  { level: 3, threshold: 300, title: 'Skilled Detective' },
  { level: 4, threshold: 600, title: 'Expert Detective' },
  { level: 5, threshold: 1000, title: 'Master Detective' },
  { level: 6, threshold: 1500, title: 'Legendary Detective' },
  { level: 7, threshold: 2500, title: 'Supreme Detective' },
  { level: 8, threshold: 4000, title: 'Mythical Detective' },
  { level: 9, threshold: 6000, title: 'Divine Detective' },
  { level: 10, threshold: 10000, title: 'Omniscient Detective' }
];

// Define point values for different actions
const POINT_VALUES = {
  BOT_DETECTED: 10,
  REPORT_SUBMITTED: 20,
  MISINFO_FLAGGED: 15,
  SOURCE_VALIDATED: 5,
  PASSIVE_VOICE_DETECTED: 5,
  LOW_CREDIBILITY_SOURCE_IDENTIFIED: 5,
  DAILY_CHALLENGE_COMPLETED: 50,
  WEEKLY_CHALLENGE_COMPLETED: 200,
  CONSECUTIVE_DAYS_BONUS: 10  // Per day
};

// Initialize user data on installation
chrome.runtime.onInstalled.addListener(function() {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Initialize storage with default values for gamification
  chrome.storage.local.set({
    // Basic report functionality
    reports: [],
    
    // User statistics
    userStats: {
      reportsSubmitted: 0,
      botsDetected: 0,
      misinfoFlagged: 0,
      sourcesValidated: 0,
      passiveDetected: 0,
      lowCredibilitySources: 0,
      lastActiveDate: today,
      consecutiveDays: 1
    },
    
    // Gamification data
    points: {
      total: 0,
      history: [],
      lastUpdated: now.toISOString()
    },
    
    // Badge system
    badges: {
      earned: [],
      progress: {}
    },
    
    // Challenge system
    challenges: {
      active: {
        daily: selectDailyChallenge(),
        weekly: selectWeeklyChallenge()
      },
      history: [],
      dailyProgress: {},
      weeklyProgress: {},
      lastDailyReset: today,
      lastWeeklyReset: getWeekStartDate(now)
    },
    
    // Level system
    level: {
      current: 1,
      title: 'Novice Detective',
      progress: 0,
      nextThreshold: 100
    },
    
    // Leaderboard data (local only)
    leaderboard: {
      localRank: 1,  // Will be updated with server data later
      localScore: 0
    }
  });
  
  console.log('OctoPal: Extension installed with gamification features');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle report submission
  if (request.action === "report") {
    handleReport(request, sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle retrieving user stats
  if (request.action === "getUserStats") {
    getUserStats(sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle updating points
  if (request.action === "awardPoints") {
    awardPoints(request.pointType, request.amount, request.details, sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle getting badges
  if (request.action === "getBadges") {
    getBadges(sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle getting badge progress
  if (request.action === "getBadgeProgress") {
    getBadgeProgress(sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle getting challenges
  if (request.action === "getChallenges") {
    getChallenges(sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle checking badge progress
  if (request.action === "checkBadgeProgress") {
    checkBadgeProgress(request.badgeType, request.amount, sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle checking challenge progress
  if (request.action === "updateChallengeProgress") {
    updateChallengeProgress(request.challengeType, request.amount, sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Handle getting the leaderboard
  if (request.action === "getLeaderboard") {
    getLeaderboard(sendResponse);
    return true; // Will respond asynchronously
  }
});

// Handle a user reporting content
async function handleReport(request, sendResponse) {
  try {
    // Get existing reports from storage
    chrome.storage.local.get(['reports', 'userStats', 'points'], function(data) {
      // Create a new report
      const newReport = {
        url: request.url,
        title: request.title,
        timestamp: new Date().toISOString()
      };
      
      // Update reports list
      const reports = data.reports || [];
      reports.push(newReport);
      
      // Update user statistics
      const userStats = data.userStats || { reportsSubmitted: 0 };
      userStats.reportsSubmitted += 1;
      
      // Update last active date and check for consecutive days
      updateConsecutiveDays(userStats);
      
      // Award points for report submission
      const points = data.points || { total: 0, history: [] };
      const pointsAwarded = POINT_VALUES.REPORT_SUBMITTED;
      points.total += pointsAwarded;
      points.history.push({
        type: 'REPORT_SUBMITTED',
        amount: pointsAwarded,
        timestamp: new Date().toISOString(),
        details: { url: request.url }
      });
      points.lastUpdated = new Date().toISOString();
      
      // Check for badge progress
      checkReportBadgeProgress(userStats.reportsSubmitted);
      
      // Check for challenge progress
      updateChallengeProgress('report_submitted', 1);
      
      // Save updated data
      chrome.storage.local.set({
        reports: reports,
        userStats: userStats,
        points: points
      }, function() {
        // Check if level up occurred
        checkAndUpdateLevel(points.total);
        
        // Notify any tabs that might be displaying stats
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "reportSubmitted",
              stats: userStats,
              pointsAwarded: pointsAwarded
            });
          }
          
          // Once everything is saved, respond to the original request
          sendResponse({ 
            success: true,
            pointsAwarded: pointsAwarded,
            totalPoints: points.total
          });
        });
      });
    });
  } catch (error) {
    console.error('OctoPal: Error handling report', error);
    sendResponse({ success: false });
  }
}

// Get user stats
function getUserStats(sendResponse) {
  chrome.storage.local.get(['userStats', 'points', 'level', 'badges', 'challenges'], function(data) {
    // Check for consecutive days and refresh daily challenges if needed
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const userStats = data.userStats || {};
    
    // Update last active date and check for consecutive days
    if (userStats.lastActiveDate !== today) {
      updateConsecutiveDays(userStats);
      
      // Save the updated user stats
      chrome.storage.local.set({ userStats: userStats }, function() {
        // Continue with sending the response
        sendResponse({
          success: true,
          userStats: userStats,
          points: data.points || { total: 0 },
          level: data.level || { current: 1 },
          badges: data.badges || { earned: [] },
          challenges: data.challenges || { active: {} }
        });
      });
    } else {
      // No updates needed, just send the data
      sendResponse({
        success: true,
        userStats: userStats,
        points: data.points || { total: 0 },
        level: data.level || { current: 1 },
        badges: data.badges || { earned: [] },
        challenges: data.challenges || { active: {} }
      });
    }
  });
}

// Broadcast points update to all open popup windows
function broadcastPointsUpdate(totalPoints, pointsAwarded, reason) {
  chrome.runtime.sendMessage({
    action: "pointsUpdated",
    totalPoints: totalPoints,
    pointsAwarded: pointsAwarded,
    reason: reason
  });
}

// Award points to the user
function awardPoints(pointType, amount, details, sendResponse) {
  if (!POINT_VALUES[pointType]) {
    sendResponse({ success: false, error: "Invalid point type" });
    return;
  }
  
  chrome.storage.local.get(['points', 'userStats'], function(data) {
    const points = data.points || { total: 0, history: [], lastUpdated: new Date().toISOString() };
    const userStats = data.userStats || {};
    
    // Calculate points to award
    const pointsAwarded = amount || POINT_VALUES[pointType];
    points.total += pointsAwarded;
    
    // Add to history
    points.history.push({
      type: pointType,
      amount: pointsAwarded,
      timestamp: new Date().toISOString(),
      details: details || {}
    });
    
    // Update last updated timestamp
    points.lastUpdated = new Date().toISOString();
    
    // Update user stats based on point type
    switch (pointType) {
      case 'BOT_DETECTED':
        userStats.botsDetected = (userStats.botsDetected || 0) + 1;
        checkBadgeProgress('bot_detection', userStats.botsDetected);
        updateChallengeProgress('bot_detection', 1);
        break;
      case 'MISINFO_FLAGGED':
        userStats.misinfoFlagged = (userStats.misinfoFlagged || 0) + 1;
        checkBadgeProgress('misinfo_flagged', userStats.misinfoFlagged);
        updateChallengeProgress('misinfo_flagged', 1);
        break;
      case 'SOURCE_VALIDATED':
        userStats.sourcesValidated = (userStats.sourcesValidated || 0) + 1;
        checkBadgeProgress('source_validation', userStats.sourcesValidated);
        updateChallengeProgress('source_validation', 1);
        break;
      case 'PASSIVE_VOICE_DETECTED':
        userStats.passiveDetected = (userStats.passiveDetected || 0) + 1;
        checkBadgeProgress('passive_detected', userStats.passiveDetected);
        updateChallengeProgress('passive_detected', 1);
        break;
      case 'LOW_CREDIBILITY_SOURCE_IDENTIFIED':
        userStats.lowCredibilitySources = (userStats.lowCredibilitySources || 0) + 1;
        checkBadgeProgress('low_credibility_sources', userStats.lowCredibilitySources);
        updateChallengeProgress('low_credibility_sources', 1);
        break;
    }
    
    // Save updated data
    chrome.storage.local.set({
      points: points,
      userStats: userStats
    }, function() {
      // Check if level up occurred
      checkAndUpdateLevel(points.total);
      
      // Broadcast points update to all open popup windows
      broadcastPointsUpdate(points.total, pointsAwarded, pointType);
      
      // Send response with updated points
      sendResponse({
        success: true,
        pointsAwarded: pointsAwarded,
        totalPoints: points.total,
        userStats: userStats
      });
    });
  });
}

// Get badges
function getBadges(sendResponse) {
  chrome.storage.local.get(['badges'], function(data) {
    const badges = data.badges || { earned: [], progress: {} };
    
    sendResponse({
      success: true,
      badges: badges,
      allBadges: BADGES
    });
  });
}

// Get challenges
function getChallenges(sendResponse) {
  chrome.storage.local.get(['challenges'], function(data) {
    let challenges = data.challenges || { 
      active: {
        daily: selectDailyChallenge(),
        weekly: selectWeeklyChallenge()
      },
      history: [],
      dailyProgress: {},
      weeklyProgress: {},
      lastDailyReset: new Date().toISOString().split('T')[0],
      lastWeeklyReset: getWeekStartDate(new Date())
    };
    
    // Check if we need to reset daily challenges
    const today = new Date().toISOString().split('T')[0];
    if (today !== challenges.lastDailyReset) {
      challenges.active.daily = selectDailyChallenge();
      challenges.dailyProgress = {};
      challenges.lastDailyReset = today;
    }
    
    // Check if we need to reset weekly challenges
    const weekStart = getWeekStartDate(new Date());
    if (weekStart !== challenges.lastWeeklyReset) {
      challenges.active.weekly = selectWeeklyChallenge();
      challenges.weeklyProgress = {};
      challenges.lastWeeklyReset = weekStart;
    }
    
    // Save any updates
    chrome.storage.local.set({ challenges: challenges }, function() {
      sendResponse({
        success: true,
        challenges: challenges,
        dailyChallenges: DAILY_CHALLENGES,
        weeklyChallenges: WEEKLY_CHALLENGES
      });
    });
  });
}

// Check badge progress and award badges if conditions are met
function checkBadgeProgress(badgeType, amount, sendResponse) {
  chrome.storage.local.get(['badges', 'userStats'], function(data) {
    const badges = data.badges || { earned: [], progress: {} };
    const userStats = data.userStats || {};
    
    // Initialize progress for this badge type if not exists
    if (!badges.progress[badgeType]) {
      badges.progress[badgeType] = 0;
    }
    
    // Update progress
    badges.progress[badgeType] = amount || (badges.progress[badgeType] + 1);
    
    // Check if any badges are earned
    const newBadges = [];
    
    Object.values(BADGES).forEach(badge => {
      if (badge.type === badgeType && 
          badges.progress[badgeType] >= badge.requirement && 
          !badges.earned.some(b => b.id === badge.id)) {
        // Badge requirements met and not already earned
        const earnedBadge = {
          ...badge,
          earnedDate: new Date().toISOString()
        };
        badges.earned.push(earnedBadge);
        newBadges.push(earnedBadge);
        
        // Send badge earned notification
        chrome.runtime.sendMessage({
          action: "badgeEarned",
          badge: earnedBadge
        });
      }
    });
    
    // Save updated badges
    chrome.storage.local.set({ badges: badges }, function() {
      // If there are new badges, award points
      if (newBadges.length > 0) {
        // Award points for each new badge (50 points per badge)
        awardPoints('BADGE_EARNED', newBadges.length * 50, { badges: newBadges.map(b => b.id) }, function(response) {
          if (sendResponse) {
            sendResponse({
              success: true,
              newBadges: newBadges,
              allBadges: badges,
              progress: badges.progress[badgeType],
              requirement: getBadgeRequirement(badgeType)
            });
          }
        });
      } else if (sendResponse) {
        sendResponse({
          success: true,
          newBadges: [],
          allBadges: badges,
          progress: badges.progress[badgeType],
          requirement: getBadgeRequirement(badgeType)
        });
      }
    });
  });
}

// Get badge requirement for a specific badge type
function getBadgeRequirement(badgeType) {
  // Find the lowest requirement badge for this type
  const badgesForType = Object.values(BADGES).filter(badge => badge.type === badgeType);
  if (badgesForType.length === 0) return 0;
  
  // Return the requirement of the badge with the lowest requirement
  const requirements = badgesForType.map(badge => badge.requirement);
  return Math.min(...requirements);
}

// Check report badge progress specifically
function checkReportBadgeProgress(reportCount) {
  checkBadgeProgress('report_submitted', reportCount);
}

// Update challenge progress
function updateChallengeProgress(challengeType, amount, sendResponse) {
  chrome.storage.local.get(['challenges', 'points'], function(data) {
    const challenges = data.challenges || {
      active: {
        daily: selectDailyChallenge(),
        weekly: selectWeeklyChallenge()
      },
      history: [],
      dailyProgress: {},
      weeklyProgress: {},
      lastDailyReset: new Date().toISOString().split('T')[0],
      lastWeeklyReset: getWeekStartDate(new Date())
    };
    
    // Check if any challenges match this type
    let challengesCompleted = [];
    let pointsAwarded = 0;
    
    // Check daily challenge
    if (challenges.active.daily && challenges.active.daily.type === challengeType) {
      // Initialize progress if not exist
      if (!challenges.dailyProgress[challenges.active.daily.id]) {
        challenges.dailyProgress[challenges.active.daily.id] = 0;
      }
      
      // Update progress
      challenges.dailyProgress[challenges.active.daily.id] += amount;
      
      // Check if completed
      if (challenges.dailyProgress[challenges.active.daily.id] >= challenges.active.daily.requirement &&
          !challenges.history.includes(challenges.active.daily.id)) {
        // Challenge completed!
        challengesCompleted.push(challenges.active.daily);
        pointsAwarded += challenges.active.daily.reward;
        challenges.history.push(challenges.active.daily.id);
        
        // Select a new daily challenge
        challenges.active.daily = selectDailyChallenge(challenges.active.daily.id);
      }
    }
    
    // Check weekly challenge
    if (challenges.active.weekly && challenges.active.weekly.type === challengeType) {
      // Initialize progress if not exist
      if (!challenges.weeklyProgress[challenges.active.weekly.id]) {
        challenges.weeklyProgress[challenges.active.weekly.id] = 0;
      }
      
      // Update progress
      challenges.weeklyProgress[challenges.active.weekly.id] += amount;
      
      // Check if completed
      if (challenges.weeklyProgress[challenges.active.weekly.id] >= challenges.active.weekly.requirement &&
          !challenges.history.includes(challenges.active.weekly.id)) {
        // Challenge completed!
        challengesCompleted.push(challenges.active.weekly);
        pointsAwarded += challenges.active.weekly.reward;
        challenges.history.push(challenges.active.weekly.id);
        
        // Select a new weekly challenge
        challenges.active.weekly = selectWeeklyChallenge(challenges.active.weekly.id);
      }
    }
    
    // Update badge progress for challenges completed
    if (challengesCompleted.length > 0) {
      checkBadgeProgress('challenges_completed', null); // will increment by 1
    }
    
    // Save updated challenges
    chrome.storage.local.set({ challenges: challenges }, function() {
      if (pointsAwarded > 0) {
        // Award points for completed challenges
        awardPoints('CHALLENGE_COMPLETED', pointsAwarded, { challenges: challengesCompleted.map(c => c.id) }, function(response) {
          if (sendResponse) {
            sendResponse({
              success: true,
              challengesCompleted: challengesCompleted,
              pointsAwarded: pointsAwarded,
              challenges: challenges
            });
          }
        });
      } else if (sendResponse) {
        sendResponse({
          success: true,
          challengesCompleted: [],
          pointsAwarded: 0,
          challenges: challenges
        });
      }
    });
  });
}

// Get the leaderboard
function getLeaderboard(sendResponse) {
  // In a real app, this would fetch data from a server
  // For this MVP, we'll just use local data
  chrome.storage.local.get(['points', 'userStats'], function(data) {
    const mockLeaderboard = [
      { name: "You", points: data.points ? data.points.total : 0, rank: 1 },
      { name: "Bot Buster", points: Math.floor(Math.random() * 200) + 800, rank: 2 },
      { name: "Truth Seeker", points: Math.floor(Math.random() * 200) + 600, rank: 3 },
      { name: "Fact Checker", points: Math.floor(Math.random() * 200) + 400, rank: 4 },
      { name: "Info Guardian", points: Math.floor(Math.random() * 200) + 200, rank: 5 },
    ];
    
    // Sort by points (highest first)
    mockLeaderboard.sort((a, b) => b.points - a.points);
    
    // Update ranks
    mockLeaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });
    
    sendResponse({
      success: true,
      leaderboard: mockLeaderboard
    });
  });
}

// Helper function to update consecutive days count
function updateConsecutiveDays(userStats) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const lastActive = userStats.lastActiveDate || today;
  
  // Calculate the difference in days
  const lastActiveDate = new Date(lastActive);
  const diffTime = Math.abs(now - lastActiveDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    // Yesterday - increment consecutive days
    userStats.consecutiveDays = (userStats.consecutiveDays || 0) + 1;
    
    // Award bonus points for consecutive days
    awardPoints('CONSECUTIVE_DAYS_BONUS', POINT_VALUES.CONSECUTIVE_DAYS_BONUS, { days: userStats.consecutiveDays });
    
    // Check for streak badges
    if (userStats.consecutiveDays >= 7) {
      checkBadgeProgress('daily_usage', userStats.consecutiveDays);
    }
  } else if (diffDays > 1) {
    // Streak broken - reset to 1
    userStats.consecutiveDays = 1;
  }
  
  // Update the last active date
  userStats.lastActiveDate = today;
  
  return userStats;
}

// Helper function to check and update level
function checkAndUpdateLevel(totalPoints) {
  chrome.storage.local.get(['level'], function(data) {
    const currentLevel = data.level || { 
      current: 1, 
      title: 'Novice Detective',
      progress: 0,
      nextThreshold: 100
    };
    
    // Find the appropriate level for the current points
    let newLevel = currentLevel.current;
    let newTitle = currentLevel.title;
    let nextThreshold = currentLevel.nextThreshold;
    
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVELS[i].threshold) {
        newLevel = LEVELS[i].level;
        newTitle = LEVELS[i].title;
        nextThreshold = i < LEVELS.length - 1 ? LEVELS[i + 1].threshold : Infinity;
        break;
      }
    }
    
    // Calculate progress to next level
    const currentThreshold = LEVELS[newLevel - 1].threshold;
    const progress = nextThreshold !== Infinity ? 
      Math.floor(((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100) : 
      100;
    
    // If level changed, update in storage
    if (newLevel !== currentLevel.current) {
      const updatedLevel = {
        current: newLevel,
        title: newTitle,
        progress: progress,
        nextThreshold: nextThreshold
      };
      
      // Save updated level
      chrome.storage.local.set({ level: updatedLevel }, function() {
        // Notify user of level up
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "levelUp",
              oldLevel: currentLevel.current,
              newLevel: newLevel,
              title: newTitle
            });
          }
        });
      });
    } else if (progress !== currentLevel.progress) {
      // Just update the progress
      const updatedLevel = {
        ...currentLevel,
        progress: progress
      };
      
      // Save updated level
      chrome.storage.local.set({ level: updatedLevel });
    }
  });
}

// Helper function to select a daily challenge
function selectDailyChallenge(previousChallengeId = null) {
  // Filter out the previous challenge
  const availableChallenges = DAILY_CHALLENGES.filter(c => c.id !== previousChallengeId);
  
  // Randomly select a challenge
  const randomIndex = Math.floor(Math.random() * availableChallenges.length);
  return availableChallenges[randomIndex];
}

// Helper function to select a weekly challenge
function selectWeeklyChallenge(previousChallengeId = null) {
  // Filter out the previous challenge
  const availableChallenges = WEEKLY_CHALLENGES.filter(c => c.id !== previousChallengeId);
  
  // Randomly select a challenge
  const randomIndex = Math.floor(Math.random() * availableChallenges.length);
  return availableChallenges[randomIndex];
}

// Helper function to get the start date of the current week (Sunday)
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 for Sunday
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

// Get badge progress data
function getBadgeProgress(sendResponse) {
  chrome.storage.local.get(['badges', 'userStats'], function(data) {
    const badges = data.badges || { earned: [], progress: {} };
    const userStats = data.userStats || {};
    
    // Compile all progress data from different sources
    let badgeProgress = {
      ...badges.progress
    };
    
    // Add progress data from userStats
    if (userStats.botsDetected) badgeProgress.bot_detection = userStats.botsDetected;
    if (userStats.misinfoFlagged) badgeProgress.misinfo_flagged = userStats.misinfoFlagged;
    if (userStats.sourcesValidated) badgeProgress.source_validation = userStats.sourcesValidated;
    if (userStats.passiveDetected) badgeProgress.passive_detected = userStats.passiveDetected;
    if (userStats.lowCredibilitySources) badgeProgress.low_credibility_sources = userStats.lowCredibilitySources;
    if (userStats.reportsSubmitted) badgeProgress.report_submitted = userStats.reportsSubmitted;
    if (userStats.consecutiveDays) badgeProgress.daily_usage = userStats.consecutiveDays;
    
    // Get earned badge dates
    const earnedDates = {};
    badges.earned.forEach(badge => {
      if (badge.id && badge.earnedDate) {
        earnedDates[badge.id] = badge.earnedDate;
      }
    });
    
    sendResponse({
      success: true,
      badgeProgress: badgeProgress,
      earnedDates: earnedDates
    });
  });
} 