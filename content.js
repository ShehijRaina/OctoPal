// OctoPal content script
console.log('OctoPal: Content script loaded');

// Cache for analyzed tweets to avoid re-analyzing
const analyzedTweets = new Map();
// Cache for user posting frequencies
const userPostFrequency = new Map();
// Cache for user account creation dates
const userAgeCache = new Map();
// Cache for user hashtag patterns
const userHashtagPatterns = new Map();

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
        hashtagPatternScore: results.hashtagPatternScore,
        detectedPatterns: results.detectedPatterns,
        accountAgeData: results.accountAgeData,
        hashtagInsights: results.hashtagInsights
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
  let hashtagPatternScoreTotal = 0;
  let detectedPatterns = [];
  let accountAgeData = [];
  let hashtagInsights = [];
  
  // If no tweets found, return default scores
  if (tweetElements.length === 0) {
    return {
      botScore: 0,
      misinfoScore: 0,
      postingFrequencyScore: 0,
      hashtagPatternScore: 0,
      detectedPatterns: [],
      accountAgeData: [],
      hashtagInsights: []
    };
  }
  
  // First pass: collect user IDs, timestamps, and hashtags for pattern analysis
  await collectUserData(tweetElements);
  
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
      hashtagPatternScoreTotal += cachedAnalysis.hashtagPatternScore || 0;
      if (cachedAnalysis.pattern) detectedPatterns.push(cachedAnalysis.pattern);
      if (cachedAnalysis.hashtagInsight) hashtagInsights.push(cachedAnalysis.hashtagInsight);
      continue;
    }
    
    // Analyze for bot-like patterns
    const botScore = analyzeTweetForBotPatterns(tweet);
    
    // Get account age data
    const username = getUsernameFromTweet(tweet);
    const userId = extractUserIdFromUsername(username);
    if (userId && userAgeCache.has(userId)) {
      const joinDate = userAgeCache.get(userId);
      const ageScore = calculateAgeScore(joinDate);
      const accountAgeInDays = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
      
      accountAgeData.push({
        username,
        joinDate: joinDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        accountAgeInDays,
        ageScore
      });
    }
    
    // Analyze for misinformation patterns
    const misinfoScore = analyzeTweetForMisinformation(tweet);
    
    // Analyze for posting frequency patterns
    const { score: postingFrequencyScore, pattern } = analyzePostingFrequency(tweet);
    
    // Analyze for hashtag usage patterns
    const { score: hashtagPatternScore, insight: hashtagInsight } = analyzeHashtagPatterns(tweet);
    
    // Cache the results
    analyzedTweets.set(tweetId, { 
      botScore, 
      misinfoScore, 
      postingFrequencyScore,
      hashtagPatternScore,
      pattern: pattern ? pattern : null,
      hashtagInsight: hashtagInsight ? hashtagInsight : null
    });
    
    botScoreTotal += botScore;
    misinfoScoreTotal += misinfoScore;
    postingFrequencyScoreTotal += postingFrequencyScore;
    hashtagPatternScoreTotal += hashtagPatternScore;
    if (pattern) detectedPatterns.push(pattern);
    if (hashtagInsight) hashtagInsights.push(hashtagInsight);
  }
  
  // Calculate average scores
  const botScore = Math.min(Math.round(botScoreTotal / tweetElements.length), 100);
  const misinfoScore = Math.min(Math.round(misinfoScoreTotal / tweetElements.length), 100);
  const postingFrequencyScore = Math.min(Math.round(postingFrequencyScoreTotal / tweetElements.length), 100);
  const hashtagPatternScore = Math.min(Math.round(hashtagPatternScoreTotal / tweetElements.length), 100);
  
  // Filter out duplicate patterns and insights
  const uniquePatterns = [...new Set(detectedPatterns)];
  const uniqueHashtagInsights = [...new Set(hashtagInsights)];
  
  return {
    botScore,
    misinfoScore,
    postingFrequencyScore,
    hashtagPatternScore,
    detectedPatterns: uniquePatterns.slice(0, 5), // Limit to top 5 patterns
    accountAgeData: accountAgeData.slice(0, 3), // Limit to top 3 accounts
    hashtagInsights: uniqueHashtagInsights.slice(0, 3) // Limit to top 3 hashtag insights
  };
}

// Collect user data for analysis
async function collectUserData(tweetElements) {
  for (const tweet of tweetElements) {
    const username = getUsernameFromTweet(tweet);
    if (!username || username === 'unknown') continue;
    
    // Get timestamp from tweet if available (for posting frequency)
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
    
    // Collect hashtags for hashtag pattern analysis
    const tweetText = getTweetText(tweet);
    if (tweetText) {
      const hashtags = extractHashtags(tweetText);
      if (hashtags.length > 0) {
        if (!userHashtagPatterns.has(username)) {
          userHashtagPatterns.set(username, {
            tweets: 1,
            totalHashtags: hashtags.length,
            uniqueHashtags: new Set(hashtags),
            hashtagCounts: hashtags.reduce((counts, tag) => {
              counts[tag] = (counts[tag] || 0) + 1;
              return counts;
            }, {}),
            hashtagPositions: getHashtagPositions(tweetText, hashtags)
          });
        } else {
          const hashtagData = userHashtagPatterns.get(username);
          hashtagData.tweets += 1;
          hashtagData.totalHashtags += hashtags.length;
          hashtags.forEach(tag => hashtagData.uniqueHashtags.add(tag));
          
          // Update hashtag counts
          for (const tag of hashtags) {
            hashtagData.hashtagCounts[tag] = (hashtagData.hashtagCounts[tag] || 0) + 1;
          }
          
          // Store hashtag positions
          const positions = getHashtagPositions(tweetText, hashtags);
          hashtagData.hashtagPositions = [...hashtagData.hashtagPositions, ...positions];
          
          userHashtagPatterns.set(username, hashtagData);
        }
      }
    }
  }
}

// Get the positions of hashtags in a tweet (beginning, middle, end, grouped)
function getHashtagPositions(tweetText, hashtags) {
  if (!tweetText || !hashtags.length) return [];
  
  const positions = [];
  const words = tweetText.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords <= 1) return []; // Skip if just one word
  
  let consecutiveHashtags = 0;
  let lastWasHashtag = false;
  
  words.forEach((word, index) => {
    const isHashtag = word.startsWith('#');
    
    if (isHashtag) {
      // Determine position in tweet
      if (index === 0) {
        positions.push('beginning');
      } else if (index === totalWords - 1) {
        positions.push('end');
      } else {
        positions.push('middle');
      }
      
      // Check for consecutive hashtags
      if (lastWasHashtag) {
        consecutiveHashtags++;
        if (consecutiveHashtags >= 3) {
          positions.push('grouped');
        }
      } else {
        consecutiveHashtags = 1;
      }
    }
    
    lastWasHashtag = isHashtag;
  });
  
  return positions;
}

// Extract hashtags from tweet text
function extractHashtags(text) {
  if (!text) return [];
  
  const hashtags = [];
  const matches = text.match(/#\w+/g);
  
  if (matches) {
    matches.forEach(tag => {
      hashtags.push(tag.toLowerCase());
    });
  }
  
  return hashtags;
}

// Get tweet text
function getTweetText(tweetElement) {
  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
  return tweetTextElement ? tweetTextElement.textContent : '';
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
  let accountAgeScore = 0;
  
  // 1. Check account age if available
  accountAgeScore = checkAccountAge(tweetElement);
  score += accountAgeScore;
  
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

// Check the account age and return a score
function checkAccountAge(tweetElement) {
  // Try to find user profile link to navigate to profile page
  const userProfileLink = tweetElement.querySelector('a[href*="/status/"]')?.closest('article')?.querySelector('a[role="link"][tabindex="-1"]');
  
  if (!userProfileLink) return 0;
  
  const userId = extractUserId(userProfileLink.getAttribute('href'));
  if (!userId) return 0;
  
  // Check if we have already cached this user's creation date
  if (userAgeCache.has(userId)) {
    return calculateAgeScore(userAgeCache.get(userId));
  }
  
  // For this version, we'll use a fallback method that extracts age from the UI if possible
  const joinDateElement = document.querySelector(`a[href="/${userId}"] + div span`);
  
  if (joinDateElement) {
    const joinDateText = joinDateElement.textContent || '';
    // Try to extract date from format like "Joined June 2022" or "Joined March 2010"
    const joinDateMatch = joinDateText.match(/Joined\s+(\w+)\s+(\d{4})/i);
    
    if (joinDateMatch && joinDateMatch.length === 3) {
      const month = getMonthNumber(joinDateMatch[1]);
      const year = parseInt(joinDateMatch[2]);
      
      if (!isNaN(month) && !isNaN(year)) {
        const joinDate = new Date(year, month - 1, 1); // We only have month precision
        userAgeCache.set(userId, joinDate);
        return calculateAgeScore(joinDate);
      }
    }
  }
  
  // Try to fetch join date via Twitter API in a future version
  // This would require additional permissions and a backend service
  
  return 0; // Default if we can't determine account age
}

// Extract user ID from profile URL
function extractUserId(url) {
  if (!url) return null;
  
  // URL pattern: /username or /username/status/123456
  const match = url.match(/^\/([^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

// Convert month name to number
function getMonthNumber(monthName) {
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
  };
  
  return months[monthName.toLowerCase()] || 0;
}

// Calculate score based on account age
function calculateAgeScore(joinDate) {
  if (!joinDate) return 0;
  
  const now = new Date();
  const accountAgeInDays = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
  
  // Scoring logic:
  // <30 days: 25 points (very suspicious)
  // 30-90 days: 20 points (suspicious)
  // 90-180 days: 15 points (somewhat suspicious)
  // 180-365 days: 10 points (slightly suspicious)
  // 1-2 years: 5 points (low suspicion)
  // >2 years: 0 points (not suspicious)
  
  if (accountAgeInDays < 30) {
    return 25;
  } else if (accountAgeInDays < 90) {
    return 20;
  } else if (accountAgeInDays < 180) {
    return 15;
  } else if (accountAgeInDays < 365) {
    return 10;
  } else if (accountAgeInDays < 730) {
    return 5;
  }
  
  return 0; // Account older than 2 years
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

// Extract user ID from username
function extractUserIdFromUsername(username) {
  if (!username || username === 'unknown') return null;
  
  // If it starts with @, remove it
  if (username.startsWith('@')) {
    username = username.substring(1);
  }
  
  return username;
}

// Analyze hashtag patterns
function analyzeHashtagPatterns(tweetElement) {
  let score = 0;
  let insight = null;
  
  const username = getUsernameFromTweet(tweetElement);
  if (!username || username === 'unknown') return { score: 0, insight: null };
  
  const userData = userHashtagPatterns.get(username);
  if (!userData) return { score: 0, insight: null };
  
  const tweetText = getTweetText(tweetElement);
  const hashtags = extractHashtags(tweetText);
  const hashtagCount = hashtags.length;
  
  // 1. Check hashtag density (hashtags per word)
  if (tweetText) {
    const wordCount = tweetText.split(/\s+/).length;
    const hashtagDensity = hashtagCount / wordCount;
    
    if (hashtagDensity > 0.4) { // More than 40% of words are hashtags
      score += 25;
      insight = "High hashtag density";
    } else if (hashtagDensity > 0.25) { // More than 25% of words are hashtags
      score += 15;
      insight = "Moderate hashtag density";
    }
  }
  
  // 2. Check for repetitive hashtag patterns across tweets
  if (userData.tweets > 1) {
    // Calculate repetition ratio (total hashtags / unique hashtags)
    const uniqueCount = userData.uniqueHashtags.size;
    const repetitionRatio = userData.totalHashtags / uniqueCount;
    
    if (repetitionRatio > 3) { // Same hashtags used more than 3 times on average
      score += 20;
      insight = "Repetitive hashtag usage across tweets";
    } else if (repetitionRatio > 2) {
      score += 10;
    }
    
    // Check if any single hashtag is used excessively
    for (const [tag, count] of Object.entries(userData.hashtagCounts)) {
      if (count >= 3) {
        score += 15;
        insight = `Excessive use of ${tag}`;
        break;
      }
    }
  }
  
  // 3. Check hashtag positions
  if (userData.hashtagPositions.includes('grouped')) {
    score += 15;
    insight = insight || "Grouped hashtags pattern";
  }
  
  // Check for hashtags exclusively at the end (common spam pattern)
  if (userData.hashtagPositions.filter(p => p === 'end').length >= 3 &&
      !userData.hashtagPositions.includes('beginning') &&
      !userData.hashtagPositions.includes('middle')) {
    score += 20;
    insight = "Hashtags exclusively at tweet end";
  }
  
  // 4. Check hashtag count threshold in current tweet
  if (hashtagCount > 6) {
    score += 25;
    insight = insight || `Excessive hashtags in tweet (${hashtagCount})`;
  } else if (hashtagCount > 4) {
    score += 15;
    insight = insight || "Multiple hashtags in tweet";
  }
  
  // 5. Check for unrelated hashtag combinations (hashtag stuffing)
  if (hashtagCount >= 3) {
    // This is a simplified check. In a real extension, you would use
    // semantic analysis to detect unrelated hashtags
    const unrelatedCategories = checkForUnrelatedHashtags(hashtags);
    if (unrelatedCategories >= 3) {
      score += 20;
      insight = "Unrelated hashtag combinations";
    }
  }
  
  // Add some randomness for demonstration
  score += Math.floor(Math.random() * 5);
  
  return {
    score: Math.min(score, 100),
    insight: insight
  };
}

// Simple check for unrelated hashtags (in a real extension this would be more sophisticated)
function checkForUnrelatedHashtags(hashtags) {
  // Categories for demo purposes
  const categories = {
    politics: ['#politics', '#biden', '#trump', '#election', '#democrat', '#republican'],
    entertainment: ['#movie', '#music', '#netflix', '#celebrity', '#hollywood'],
    sports: ['#nba', '#football', '#soccer', '#baseball', '#sports'],
    technology: ['#tech', '#ai', '#programming', '#coding', '#software'],
    health: ['#covid', '#health', '#vaccine', '#fitness', '#wellness']
  };
  
  // Count how many different categories appear in the hashtags
  const categoriesFound = new Set();
  
  for (const tag of hashtags) {
    for (const [category, terms] of Object.entries(categories)) {
      if (terms.some(term => tag.toLowerCase().includes(term.toLowerCase().substring(1)))) {
        categoriesFound.add(category);
      }
    }
  }
  
  return categoriesFound.size;
} 