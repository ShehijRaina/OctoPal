// OctoPal content script
console.log('OctoPal: Content script loaded');

// Cache for analyzed tweets to avoid re-analyzing
const analyzedTweets = new Map();
// Cache for user posting frequencies
const userPostFrequency = new Map();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "analyze") {
    // Perform analysis of the current page
    analyzeCurrentPage().then(results => {
      // Send results back to popup
      sendResponse({
        success: true,
        botScore: results.botScore,
        misinfoScore: results.misinfoScore,
        postingFrequencyScore: results.postingFrequencyScore,
        detectedPatterns: results.detectedPatterns
      });
    }).catch(error => {
      console.error('OctoPal: Error analyzing page', error);
      sendResponse({success: false});
    });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Analyze the current Twitter page
async function analyzeCurrentPage() {
  // This is a very simplified implementation
  // In a real extension, you would use more sophisticated analysis
  
  const allTweets = document.querySelectorAll('[data-testid="tweet"]');

  // Filter tweets that are visible in the viewport
  const tweetElements = Array.from(allTweets).filter(tweet => {
    const rect = tweet.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
  });

  let botScoreTotal = 0;
  let misinfoScoreTotal = 0;
  let postingFrequencyScoreTotal = 0;
  let detectedPatterns = [];
  
  // If no tweets found, return default scores
  if (tweetElements.length === 0) {
    return {
      botScore: 0,
      misinfoScore: 0,
      postingFrequencyScore: 0,
      detectedPatterns: []
    };
  }
  
  // First pass: collect user IDs and timestamps for posting frequency analysis
  await collectUserPostingData(tweetElements);
  
  // Second pass: analyze each tweet with enhanced context
  for (const tweet of tweetElements) {
    // Get tweet ID or some unique identifier
    const tweetId = getTweetId(tweet);
    
    // Skip if already analyzed
    if (analyzedTweets.has(tweetId)) {
      const cachedAnalysis = analyzedTweets.get(tweetId);
      botScoreTotal += cachedAnalysis.botScore;
      misinfoScoreTotal += cachedAnalysis.misinfoScore;
      postingFrequencyScoreTotal += cachedAnalysis.postingFrequencyScore;
      if (cachedAnalysis.pattern) detectedPatterns.push(cachedAnalysis.pattern);
      continue;
    }
    
    // Analyze for bot-like patterns
    const botScore = analyzeTweetForBotPatterns(tweet);
    
    // Analyze for misinformation patterns
    const misinfoScore = analyzeTweetForMisinformation(tweet);
    
    // Analyze for posting frequency patterns
    const { score: postingFrequencyScore, pattern } = analyzePostingFrequency(tweet);
    
    // Cache the results
    analyzedTweets.set(tweetId, { 
      botScore, 
      misinfoScore, 
      postingFrequencyScore,
      pattern: pattern ? pattern : null
    });
    
    botScoreTotal += botScore;
    misinfoScoreTotal += misinfoScore;
    postingFrequencyScoreTotal += postingFrequencyScore;
    if (pattern) detectedPatterns.push(pattern);
  }
  
  // Calculate average scores
  const botScore = Math.min(Math.round(botScoreTotal / tweetElements.length), 100);
  const misinfoScore = Math.min(Math.round(misinfoScoreTotal / tweetElements.length), 100);
  const postingFrequencyScore = Math.min(Math.round(postingFrequencyScoreTotal / tweetElements.length), 100);
  
  // Filter out duplicate patterns
  const uniquePatterns = [...new Set(detectedPatterns)];
  
  return {
    botScore,
    misinfoScore,
    postingFrequencyScore,
    detectedPatterns: uniquePatterns.slice(0, 5) // Limit to top 5 patterns
  };
}

// Get a unique identifier for a tweet
function getTweetId(tweetElement) {
  // Try to find a data attribute with the tweet ID
  const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
  if (tweetLink) {
    const href = tweetLink.getAttribute('href');
    const match = href.match(/\/status\/(\d+)/);
    if (match && match[1]) return match[1];
  }
  
  // Fallback: use a combination of username and text content
  const username = getUsernameFromTweet(tweetElement);
  const textContent = tweetElement.textContent?.slice(0, 50) || '';
  return `${username}-${textContent}`;
}

// Extract username from tweet
function getUsernameFromTweet(tweetElement) {
  const usernameElement = tweetElement.querySelector('[data-testid="User-Name"]');
  if (usernameElement) {
    const usernameText = usernameElement.textContent || '';
    // Usually usernames are in the format "Name @username"
    const usernameMatch = usernameText.match(/@(\w+)/);
    if (usernameMatch && usernameMatch[1]) return usernameMatch[1];
    return usernameText;
  }
  return 'unknown';
}

// Collect user posting data for frequency analysis
async function collectUserPostingData(tweetElements) {
  for (const tweet of tweetElements) {
    const username = getUsernameFromTweet(tweet);
    if (!username || username === 'unknown') continue;
    
    // Get timestamp from tweet if available
    const timestamp = getTweetTimestamp(tweet);
    
    // Store in userPostFrequency map
    if (!userPostFrequency.has(username)) {
      userPostFrequency.set(username, {
        postCount: 1,
        timestamps: timestamp ? [timestamp] : [],
        firstSeen: Date.now()
      });
    } else {
      const userData = userPostFrequency.get(username);
      userData.postCount += 1;
      if (timestamp) userData.timestamps.push(timestamp);
      userPostFrequency.set(username, userData);
    }
  }
}

// Try to get tweet timestamp
function getTweetTimestamp(tweetElement) {
  const timeElement = tweetElement.querySelector('time');
  if (timeElement) {
    const datetime = timeElement.getAttribute('datetime');
    if (datetime) return new Date(datetime).getTime();
  }
  return null;
}

// Simple bot detection logic (very basic for demonstration)
function analyzeTweetForBotPatterns(tweetElement) {
  let score = 0;
  
  // 1. Check account age if available
  // For this demo, we're randomly assigning a score component
  // In a real extension, you'd check the actual creation date
  if (Math.random() < 0.3) {
    score += 20; // Simulate "new account" detection
  }
  
  // 2. Check for username patterns that might indicate bots
  const usernameElement = tweetElement.querySelector('[data-testid="User-Name"]');
  if (usernameElement) {
    const usernameText = usernameElement.textContent || '';
    // Check for random-looking usernames with lots of numbers
    if (/\w+\d{4,}/.test(usernameText)) {
      score += 25;
    }
    // Check for default-looking usernames
    if (/[a-zA-Z]+\d{6,}/.test(usernameText)) {
      score += 15;
    }
  }
  
  // 3. Check posting frequency (now handled by analyzePostingFrequency)
  
  // 4. Check for verified status (less likely to be bots)
  const verifiedBadge = tweetElement.querySelector('[data-testid="icon-verified"]');
  if (!verifiedBadge) {
    score += 10;
  }
  
  // 5. Check for profile picture (bots often don't have custom profile pictures)
  const profileImage = tweetElement.querySelector('img[src*="profile_images"]');
  if (!profileImage) {
    score += 15;
  } else {
    const imgSrc = profileImage.getAttribute('src');
    if (imgSrc && imgSrc.includes('default_profile')) {
      score += 15;
    }
  }
  
  // Add some randomness for demonstration
  score += Math.floor(Math.random() * 10);
  
  return Math.min(score, 100);
}

// Analyze posting frequency patterns
function analyzePostingFrequency(tweetElement) {
  let score = 0;
  let pattern = null;
  
  const username = getUsernameFromTweet(tweetElement);
  if (!username || username === 'unknown') return { score: 0, pattern: null };
  
  const userData = userPostFrequency.get(username);
  if (!userData) return { score: 0, pattern: null };
  
  // 1. Check for high post count
  if (userData.postCount > 5) {
    score += 20;
    pattern = "High volume of posts";
  }
  
  // 2. Check for regular time intervals (potential automation)
  if (userData.timestamps.length >= 3) {
    const intervals = [];
    for (let i = 1; i < userData.timestamps.length; i++) {
      intervals.push(userData.timestamps[i] - userData.timestamps[i-1]);
    }
    
    // Check if intervals are suspiciously regular
    const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const intervalVariance = intervals.map(interval => Math.abs(interval - averageInterval))
      .reduce((sum, val) => sum + val, 0) / intervals.length;
    
    if (intervalVariance < 60000) { // Less than 1 minute variance
      score += 30;
      pattern = "Regular posting intervals (potential automation)";
    } else if (intervalVariance < 300000) { // Less than 5 minutes variance
      score += 15;
      pattern = "Somewhat regular posting pattern";
    }
  }
  
  // 3. Check for posting velocity (many posts in a short time)
  const timeSinceFirstSeen = Date.now() - userData.firstSeen;
  const postsPerMinute = (userData.postCount / (timeSinceFirstSeen / 60000));
  
  if (postsPerMinute > 0.5) { // More than 1 post every 2 minutes
    score += 25;
    pattern = "High posting frequency";
  } else if (postsPerMinute > 0.2) { // More than 1 post every 5 minutes
    score += 10;
    pattern = "Moderate posting frequency";
  }
  
  // Add some randomness for demonstration
  score += Math.floor(Math.random() * 10);
  
  return { 
    score: Math.min(score, 100),
    pattern: pattern
  };
}

// Enhanced misinformation detection logic
function analyzeTweetForMisinformation(tweetElement) {
  let score = 0;
  
  // Get the tweet text content
  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
  if (!tweetTextElement) return Math.floor(Math.random() * 30); // Return random score if no text
  
  const tweetText = tweetTextElement.textContent || '';
  
  // 1. Check for excessive capitalization (often used in misleading content)
  const uppercaseRatio = (tweetText.replace(/[^A-Z]/g, '').length) / 
                          (tweetText.replace(/[^A-Za-z]/g, '').length || 1);
  if (uppercaseRatio > 0.3) {
    score += 20;
  }
  
  // 2. Check for excessive exclamation marks
  const exclamationCount = (tweetText.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    score += 15;
  }
  
  // 3. Check for keywords often associated with misinformation
  const misinfoKeywords = [
    'they don\'t want you to know',
    'wake up',
    'the truth',
    'do your research',
    'they\'re hiding',
    'conspiracy',
    'hoax',
    'fake news',
    'mainstream media won\'t tell you',
    'what they don\'t want you to know',
    'government is lying',
    'banned information',
    'censored',
    'cover-up',
    'secret cure',
    'they\'re lying to you',
    'doctors won\'t tell you',
    'shocking truth',
    'proven fact',
    'wake up sheeple',
    'big pharma',
    'what they\'re hiding',
    'msm lies',
    'this is not a coincidence'
  ];
  
  let keywordFound = false;
  misinfoKeywords.forEach(keyword => {
    if (!keywordFound && tweetText.toLowerCase().includes(keyword)) {
      score += 15;
      keywordFound = true;
    }
  });
  
  // 4. Check for many hashtags (sometimes indicates spam/misinfo campaigns)
  const hashtagCount = (tweetText.match(/#\w+/g) || []).length;
  if (hashtagCount > 5) {
    score += 20;
  } else if (hashtagCount > 3) {
    score += 10;
  }
  
  // 5. Check for suspicious links
  const linkElements = tweetElement.querySelectorAll('a[href]');
  const suspiciousDomains = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co',
    'info-war', 'truth-', '-truth', 'freedom-', 
    'patriot', 'liberty', 'conspiracy', 'exposing'
  ];
  
  let suspiciousLinkFound = false;
  linkElements.forEach(link => {
    if (suspiciousLinkFound) return;
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    for (const domain of suspiciousDomains) {
      if (href.includes(domain)) {
        score += 15;
        suspiciousLinkFound = true;
        break;
      }
    }
  });
  
  // 6. Check for sensationalist phrases
  const sensationalistPhrases = [
    'shocking', 'mind-blowing', 'you won\'t believe',
    'speechless', 'will shock you', 'bombshell',
    'explosive', 'game-changer', 'before it\'s deleted',
    'hidden camera', 'secret recording', 'breaking'
  ];
  
  let sensationalistPhraseFound = false;
  sensationalistPhrases.forEach(phrase => {
    if (!sensationalistPhraseFound && tweetText.toLowerCase().includes(phrase)) {
      score += 10;
      sensationalistPhraseFound = true;
    }
  });
  
  // 7. Check for overgeneralizations
  const overgeneralizationPhrases = [
    'always', 'never', 'everyone knows', 'nobody wants',
    'all people', 'every single', '100 percent',
    'all of them', 'none of them'
  ];
  
  let overgeneralizationFound = false;
  overgeneralizationPhrases.forEach(phrase => {
    if (!overgeneralizationFound && tweetText.toLowerCase().includes(phrase)) {
      score += 10;
      overgeneralizationFound = true;
    }
  });
  
  // Add some randomness for demonstration (smaller range)
  score += Math.floor(Math.random() * 10);
  
  return Math.min(score, 100);
} 