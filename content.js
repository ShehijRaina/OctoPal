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

// Track if analysis is in progress to prevent concurrent analysis
let analysisInProgress = false;
// Track the last analysis time to throttle frequent analyses
let lastAnalysisTime = 0;
// Scroll detection variables
let lastScrollPosition = 0;
let scrollTimeout = null;
let tweetCountBeforeScroll = 0;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Add a ping handler to check if content script is loaded
  if (request.action === "ping") {
    sendResponse({ success: true });
    return true;
  }
  
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
        hashtagInsights: results.hashtagInsights,
        languagePatterns: results.languagePatterns,
        passiveVoiceExamples: results.passiveVoiceExamples,
        sourceCredibilityScore: results.sourceCredibilityScore,
        sourceDetails: results.sourceDetails,
        googleFactResponse: results.googleFactResponse
      });
    }).catch(error => {
      console.error('OctoPal: Error analyzing page', error);
      // Send a more descriptive error message
      sendResponse({
        success: false, 
        error: error.message || 'Unknown error occurred while analyzing the page',
        errorStack: error.stack
      });
    });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Set up scroll detection when the content script loads
function setupScrollDetection() {
  // Initialize tweet count
  tweetCountBeforeScroll = countVisibleTweets();
  lastScrollPosition = window.scrollY;
  
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
  
  console.log('OctoPal: Scroll detection initialized');
}

// Handle scroll events
function handleScroll() {
  // Clear existing timeout if any
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  // Set a new timeout to detect when scrolling stops
  scrollTimeout = setTimeout(() => {
    // Check if we've scrolled enough to potentially load new content
    const currentScrollPosition = window.scrollY;
    const scrollDistance = Math.abs(currentScrollPosition - lastScrollPosition);
    
    // Only check for new tweets if we've scrolled a significant amount
    if (scrollDistance > 300) {
      const currentTweetCount = countVisibleTweets();
      
      // If new tweets have been loaded
      if (currentTweetCount > tweetCountBeforeScroll) {
        console.log(`OctoPal: New tweets detected (${currentTweetCount - tweetCountBeforeScroll} new tweets)`);
        
        // Throttle analysis to prevent too frequent updates
        const now = Date.now();
        if (now - lastAnalysisTime > 3000) { // Don't analyze more than once every 3 seconds
          lastAnalysisTime = now;
          
          // Perform a new analysis and send results to popup if open
          performBackgroundAnalysis();
        }
        
        // Update the baseline count
        tweetCountBeforeScroll = currentTweetCount;
      }
      
      // Update last scroll position
      lastScrollPosition = currentScrollPosition;
    }
  }, 500); // Wait for 500ms after scrolling stops
}

// Count visible tweets on the page
function countVisibleTweets() {
  // Try multiple possible selectors for tweets
  const possibleSelectors = [
    '[data-testid="tweet"]',
    '[data-testid="tweetText"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"]'
  ];
  
  // Try each selector
  for (const selector of possibleSelectors) {
    const tweets = document.querySelectorAll(selector);
    if (tweets && tweets.length > 0) {
      return tweets.length;
    }
  }
  
  return 0;
}

// Perform analysis in the background and send results to popup if open
function performBackgroundAnalysis() {
  if (analysisInProgress) {
    console.log('OctoPal: Analysis already in progress, skipping');
    return;
  }
  
  analysisInProgress = true;
  console.log('OctoPal: Starting background analysis after scroll');
  
  analyzeCurrentPage()
    .then(results => {
      // Send results to popup if it's open
      chrome.runtime.sendMessage({
        action: "analysisUpdated",
        results: {
          botScore: results.botScore,
          misinfoScore: results.misinfoScore,
          postingFrequencyScore: results.postingFrequencyScore,
          hashtagPatternScore: results.hashtagPatternScore,
          detectedPatterns: results.detectedPatterns,
          accountAgeData: results.accountAgeData,
          hashtagInsights: results.hashtagInsights,
          languagePatterns: results.languagePatterns,
          passiveVoiceExamples: results.passiveVoiceExamples,
          sourceCredibilityScore: results.sourceCredibilityScore,
          sourceDetails: results.sourceDetails,
          googleFactResponse: results.googleFactResponse
        }
      }, response => {
        // Check if the popup is open and received the message
        if (chrome.runtime.lastError) {
          // Popup is not open or couldn't receive the message - that's okay
          console.log('OctoPal: Popup not available to receive analysis update');
        } else if (response && response.success) {
          console.log('OctoPal: Analysis results sent to popup');
        }
      });
    })
    .catch(error => {
      console.error('OctoPal: Error during background analysis', error);
    })
    .finally(() => {
      analysisInProgress = false;
    });
}

// Analyze the current Twitter page
async function analyzeCurrentPage() {
  // This is a very simplified implementation
  // In a real extension, you would use more sophisticated analysis
  
  // Try multiple possible selectors for tweets
  let allTweets = [];
  const possibleSelectors = [
    '[data-testid="tweet"]',
    '[data-testid="tweetText"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"]'
  ];
  
  // Try each selector
  for (const selector of possibleSelectors) {
    const tweets = document.querySelectorAll(selector);
    if (tweets && tweets.length > 0) {
      console.log(`OctoPal: Found ${tweets.length} tweets using selector: ${selector}`);
      allTweets = tweets;
      break;
    }
  }
  
  // If no tweets found with any selector
  if (allTweets.length === 0) {
    console.warn('OctoPal: No tweets found with any selector. Twitter DOM may have changed.');
  }

  // Filter tweets that are visible in the viewport
  const tweetElements = Array.from(allTweets).filter(tweet => {
    const rect = tweet.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
  });

  // Log for debugging
  console.log(`OctoPal: Found ${tweetElements.length} visible tweets on the page`);

  let botScoreTotal = 0;
  let misinfoScoreTotal = 0;
  let postingFrequencyScoreTotal = 0;
  let hashtagPatternScoreTotal = 0;
  let detectedPatterns = [];
  let accountAgeData = [];
  let hashtagInsights = [];
  let languagePatterns = [];
  let passiveVoiceExamples = [];
  let googleFactResponse = "Fact-Checking by Google FactCheck";
  let sourceCredibilityScoreTotal = 0;
  let sourceDetails = [];
  let sourcesFound = false;
  let sourceCount = 0;
  
  // If no tweets found, return default scores
  if (tweetElements.length === 0) {
    return {
      botScore: 0,
      misinfoScore: 0,
      postingFrequencyScore: 0,
      hashtagPatternScore: 0,
      detectedPatterns: [],
      accountAgeData: [],
      hashtagInsights: [],
      languagePatterns: [],
      passiveVoiceExamples: [],
      sourceCredibilityScore: 50,
      sourceDetails: [],
      googleFactResponse: "Fact-Checking by Google FactCheck"
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
      if (cachedAnalysis.languagePatterns) {
        cachedAnalysis.languagePatterns.forEach(pattern => languagePatterns.push(pattern));
      }
      if (cachedAnalysis.passiveVoiceExamples && cachedAnalysis.passiveVoiceExamples.length > 0) {
        cachedAnalysis.passiveVoiceExamples.forEach(example => passiveVoiceExamples.push(example));
      }
      if (cachedAnalysis.sourceCredibilityScore) {
        sourceCredibilityScoreTotal += cachedAnalysis.sourceCredibilityScore;
        sourceCount++;
      }
      if (cachedAnalysis.sourceDetails && cachedAnalysis.sourceDetails.length > 0) {
        cachedAnalysis.sourceDetails.forEach(source => {
          // Add source if not already in the list
          if (!sourceDetails.some(s => s.domain === source.domain)) {
            sourceDetails.push(source);
          }
        });
        if (!sourcesFound && cachedAnalysis.sourceDetails.length > 0) {
          sourcesFound = true;
        }
      }
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
    const misinfoResult = analyzeTweetForMisinformation(tweet);
    const misinfoScore = misinfoResult.score;
    
    // Add detected language patterns to the collection
    if (misinfoResult.patterns && misinfoResult.patterns.length > 0) {
      misinfoResult.patterns.forEach(pattern => languagePatterns.push(pattern));
    }
    
    // Add passive voice examples
    if (misinfoResult.passiveExamples && misinfoResult.passiveExamples.length > 0) {
      misinfoResult.passiveExamples.forEach(example => passiveVoiceExamples.push(example));
    }

    // Analyze sources and their credibility
    const sourceAnalysis = analyzeSourcesInTweet(tweet);
    let tweetSourceCredibilityScore = 50; // Default neutral score
    let tweetSourceDetails = [];
    
    if (sourceAnalysis.sourcesFound) {
      tweetSourceCredibilityScore = sourceAnalysis.credibilityScore;
      tweetSourceDetails = sourceAnalysis.sourceDetails;
      sourceCredibilityScoreTotal += tweetSourceCredibilityScore;
      sourceCount++;
      
      // Add source details if unique
      tweetSourceDetails.forEach(source => {
        if (!sourceDetails.some(s => s.domain === source.domain)) {
          sourceDetails.push(source);
        }
      });
      
      if (!sourcesFound && tweetSourceDetails.length > 0) {
        sourcesFound = true;
      }
    }

    const tweetText = getTweetText(tweet);
    
    // Try to get fact-checking data, but don't block if the server isn't responding
    try {
      // Safely check for fact-checking data with a timeout
      const factCheckData = await Promise.race([
        fetch(`http://127.0.0.1:5000/call-python?input=${encodeURIComponent(tweetText)}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fact-check request timeout')), 1500)
        )
      ]);
      
      if (factCheckData && factCheckData.result) {
        googleFactResponse = factCheckData.result;
      }
    } catch (error) {
      console.log('Fact-checking API not available:', error.message);
      // Continue without fact-checking data
    }
    
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
      hashtagInsight: hashtagInsight ? hashtagInsight : null,
      languagePatterns: misinfoResult.patterns || [],
      passiveVoiceExamples: misinfoResult.passiveExamples || [],
      sourceCredibilityScore: tweetSourceCredibilityScore,
      sourceDetails: tweetSourceDetails
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
  
  // Calculate source credibility score
  const sourceCredibilityScore = sourcesFound && sourceCount > 0 ? 
    Math.min(Math.round(sourceCredibilityScoreTotal / sourceCount), 100) : 50;
  
  // Filter out duplicate patterns and insights
  const uniquePatterns = [...new Set(detectedPatterns)];
  const uniqueHashtagInsights = [...new Set(hashtagInsights)];
  const uniqueLanguagePatterns = [...new Set(languagePatterns)];
  const uniquePassiveExamples = [...new Set(passiveVoiceExamples)];
  
  // Sort source details by credibility score (highest first)
  sourceDetails.sort((a, b) => b.score - a.score);
  
  return {
    botScore,
    misinfoScore,
    postingFrequencyScore,
    hashtagPatternScore,
    detectedPatterns: uniquePatterns.slice(0, 5), // Limit to top 5 patterns
    accountAgeData: accountAgeData.slice(0, 3), // Limit to top 3 accounts
    hashtagInsights: uniqueHashtagInsights.slice(0, 3), // Limit to top 3 hashtag insights
    languagePatterns: uniqueLanguagePatterns.slice(0, 5), // Limit to top 5 language patterns
    passiveVoiceExamples: uniquePassiveExamples.slice(0, 3), // Limit to top 3 passive voice examples
    sourceCredibilityScore, // Source credibility score
    sourceDetails: sourceDetails.slice(0, 5), // Limit to top 5 sources
    googleFactResponse: googleFactResponse
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
  // Try multiple possible selectors for tweet text (updated for current Twitter DOM)
  const selectors = [
    '[data-testid="tweetText"]',
    '.css-901oao',  // Common Twitter text class
    'div[lang]',    // Text elements often have lang attribute
    'div[dir="auto"]', // Text often has dir=auto
    'article[role="article"] div[lang]',
    'div[data-testid="cellInnerDiv"] div[lang]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const element = tweetElement.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }
  
  // Fallback: try to find any text node with substantial content
  const textNodes = Array.from(tweetElement.querySelectorAll('div'))
    .filter(div => {
      const text = div.textContent?.trim() || '';
      return text.length > 20 && !text.includes('Retweeted') && !text.includes('Liked'); 
    });
  
  if (textNodes.length > 0) {
    // Sort by content length (longest first) as it's likely the tweet content
    textNodes.sort((a, b) => b.textContent.length - a.textContent.length);
    return textNodes[0].textContent.trim();
  }
  
  // Last resort: just return all text content
  return tweetElement.textContent.trim();
}

// Get a unique identifier for a tweet
function getTweetId(tweetElement) {
  // Try multiple methods to get a tweet ID
  
  // Method 1: Try to find a data attribute with the tweet ID
  const tweetLinkSelectors = [
    'a[href*="/status/"]',
    'a[role="link"][href*="/status/"]',
    'div[role="link"][tabindex="0"]'
  ];
  
  for (const selector of tweetLinkSelectors) {
    const tweetLink = tweetElement.querySelector(selector);
    if (tweetLink) {
      const href = tweetLink.getAttribute('href');
      if (href) {
        const match = href.match(/\/status\/(\d+)/);
        if (match && match[1]) return match[1];
      }
    }
  }
  
  // Method 2: Try to find data-tweet-id attribute
  const idAttributes = ['data-tweet-id', 'data-testid', 'id'];
  for (const attr of idAttributes) {
    const id = tweetElement.getAttribute(attr);
    if (id) return id;
  }
  
  // Method 3: Try to find time element's datetime
  const timeElement = tweetElement.querySelector('time');
  if (timeElement && timeElement.getAttribute('datetime')) {
    return `time-${timeElement.getAttribute('datetime')}`;
  }
  
  // Fallback: use a combination of username and text content to create a unique identifier
  const username = getUsernameFromTweet(tweetElement);
  const textContent = getTweetText(tweetElement).slice(0, 50);
  const timestamp = new Date().getTime();
  return `${username}-${textContent}-${timestamp}`;
}

// Extract username from tweet
function getUsernameFromTweet(tweetElement) {
  // Try multiple selectors for username
  const usernameSelectors = [
    '[data-testid="User-Name"]', 
    'a[role="link"][href^="/"]',
    'div[dir="ltr"] span.css-901oao',  // Common Twitter username span
    'a[tabindex="-1"][role="link"][href^="/"]',
    'a[href^="/"][aria-label]'  // Profile links often have aria-label
  ];
  
  // Try each selector
  for (const selector of usernameSelectors) {
    const element = tweetElement.querySelector(selector);
    if (!element) continue;
    
    // Check if the element text contains @username
    const text = element.textContent || '';
    const usernameMatch = text.match(/@(\w+)/);
    if (usernameMatch && usernameMatch[1]) {
      return usernameMatch[1];
    }
    
    // Check if we can extract from href
    const href = element.getAttribute('href');
    if (href) {
      const hrefMatch = href.match(/^\/([^/?]+)/);
      if (hrefMatch && hrefMatch[1] && 
          !['search', 'explore', 'home', 'notifications', 'messages'].includes(hrefMatch[1])) {
        return hrefMatch[1];
      }
    }
  }
  
  // Try to look for a tweet author element pattern
  const authorElements = Array.from(tweetElement.querySelectorAll('a[role="link"]'))
    .filter(link => {
      const href = link.getAttribute('href');
      return href && href.startsWith('/') && !href.includes('/status/') && 
             !href.includes('/search') && link.textContent && 
             link.textContent.length > 0;
    });
  
  if (authorElements.length > 0) {
    // First or shortest is usually the username
    authorElements.sort((a, b) => a.textContent.length - b.textContent.length);
    const text = authorElements[0].textContent;
    const usernameMatch = text.match(/@(\w+)/);
    if (usernameMatch && usernameMatch[1]) {
      return usernameMatch[1];
    }
    
    const href = authorElements[0].getAttribute('href');
    if (href) {
      const hrefMatch = href.match(/^\/([^/?]+)/);
      if (hrefMatch && hrefMatch[1]) {
        return hrefMatch[1];
      }
    }
    
    return authorElements[0].textContent.trim();
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
  let detectedPatterns = [];
  let passiveInstances = [];
  
  // Get the tweet text content
  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
  if (!tweetTextElement) return { score: Math.floor(Math.random() * 30), patterns: [], passiveExamples: [] }; // Return random score if no text
  
  const tweetText = tweetTextElement.textContent || '';

  // 1. Check for excessive capitalization (often used in misleading content)
  const uppercaseRatio = (tweetText.replace(/[^A-Z]/g, '').length) / 
                          (tweetText.replace(/[^A-Za-z]/g, '').length || 1);
  if (uppercaseRatio > 0.3) {
    score += 20;
    detectedPatterns.push("Excessive capitalization");
  }
  
  // 2. Check for excessive exclamation marks
  const exclamationCount = (tweetText.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    score += 15;
    detectedPatterns.push("Multiple exclamation marks");
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
  let keywordDetected = "";
  misinfoKeywords.forEach(keyword => {
    if (!keywordFound && tweetText.toLowerCase().includes(keyword)) {
      score += 15;
      keywordFound = true;
      keywordDetected = keyword;
    }
  });
  
  if (keywordFound) {
    detectedPatterns.push(`Misinformation keyword: "${keywordDetected}"`);
  }
  
  // 4. Check for many hashtags (sometimes indicates spam/misinfo campaigns)
  const hashtagCount = (tweetText.match(/#\w+/g) || []).length;
  if (hashtagCount > 5) {
    score += 20;
    detectedPatterns.push("Excessive hashtag use");
  } else if (hashtagCount > 3) {
    score += 10;
    detectedPatterns.push("Multiple hashtags");
  }
  
  // 5. Check for suspicious links
  const linkElements = tweetElement.querySelectorAll('a[href]');
  const suspiciousDomains = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co',
    'info-war', 'truth-', '-truth', 'freedom-', 
    'patriot', 'liberty', 'conspiracy', 'exposing'
  ];
  
  let suspiciousLinkFound = false;
  let suspiciousDomain = "";
  linkElements.forEach(link => {
    if (suspiciousLinkFound) return;
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    for (const domain of suspiciousDomains) {
      if (href.includes(domain)) {
        score += 15;
        suspiciousLinkFound = true;
        suspiciousDomain = domain;
        break;
      }
    }
  });
  
  if (suspiciousLinkFound) {
    detectedPatterns.push(`Suspicious link: ${suspiciousDomain}`);
  }
  
  // 6. Check for sensationalist phrases
  const sensationalistPhrases = [
    'shocking', 'mind-blowing', 'you won\'t believe',
    'speechless', 'will shock you', 'bombshell',
    'explosive', 'game-changer', 'before it\'s deleted',
    'hidden camera', 'secret recording', 'breaking'
  ];
  
  let sensationalistPhraseFound = false;
  let sensationalistPhraseDetected = "";
  sensationalistPhrases.forEach(phrase => {
    if (!sensationalistPhraseFound && tweetText.toLowerCase().includes(phrase)) {
      score += 10;
      sensationalistPhraseFound = true;
      sensationalistPhraseDetected = phrase;
    }
  });
  
  if (sensationalistPhraseFound) {
    detectedPatterns.push(`Sensationalist language: "${sensationalistPhraseDetected}"`);
  }
  
  // 7. Check for overgeneralizations
  const overgeneralizationPhrases = [
    'always', 'never', 'everyone knows', 'nobody wants',
    'all people', 'every single', '100 percent',
    'all of them', 'none of them'
  ];
  
  let overgeneralizationFound = false;
  let overgeneralizationDetected = "";
  overgeneralizationPhrases.forEach(phrase => {
    if (!overgeneralizationFound && tweetText.toLowerCase().includes(phrase)) {
      score += 10;
      overgeneralizationFound = true;
      overgeneralizationDetected = phrase;
    }
  });
  
  if (overgeneralizationFound) {
    detectedPatterns.push(`Overgeneralization: "${overgeneralizationDetected}"`);
  }
  
  // 8. NEW: Check for sentence structures common in misinformation
  const sentences = tweetText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  // 8.1 Check for "they don't want you to know" structure
  const conspiracyStructures = [
    /they (don't|won't|do not|won't) (want|allow) (you|us|people|the public) to (know|see|find out|discover)/i,
    /what they (don't|won't|do not|won't) (want|allow) (you|us|people|the public) to (know|see|find out|discover)/i,
    /(they are|they're) (hiding|concealing|suppressing) (this|it|the truth|the facts)/i,
    /(they|mainstream media|government) (is|are) (lying|hiding|covering up)/i,
    /the (truth about|real story on|facts about) (this|it) (is|are) being (suppressed|hidden|censored)/i
  ];
  
  for (const sentence of sentences) {
    for (const pattern of conspiracyStructures) {
      if (pattern.test(sentence)) {
        score += 20;
        detectedPatterns.push("Conspiracy theory sentence structure");
        break;
      }
    }
  }
  
  // 8.2 Check for false authority claims
  const falseAuthorityStructures = [
    /according to (our research|my research|independent researchers|experts who disagree)/i,
    /(many|most) (doctors|scientists|experts) (don't|won't) tell you/i,
    /(undeniable|irrefutable) (evidence|proof) (shows|proves|confirms)/i,
    /what (doctors|scientists|experts) (don't|won't) tell you/i,
    /studies that (they|mainstream media|government) (ignore|suppress|hide)/i
  ];
  
  for (const sentence of sentences) {
    for (const pattern of falseAuthorityStructures) {
      if (pattern.test(sentence)) {
        score += 15;
        detectedPatterns.push("False authority claim");
        break;
      }
    }
  }
  
  // 8.3 Check for fear-inducing structures
  const fearStructures = [
    /if (you|we) don't (act|do something|wake up) (now|immediately|soon)/i,
    /(they|it) will (destroy|kill|end|ruin) (us|you|everything|our country)/i,
    /(time is|we're) running out/i,
    /before it('s| is) too late/i,
    /the (end|destruction) of (our|your) (freedom|rights|liberty|way of life)/i
  ];
  
  for (const sentence of sentences) {
    for (const pattern of fearStructures) {
      if (pattern.test(sentence)) {
        score += 15;
        detectedPatterns.push("Fear-inducing sentence structure");
        break;
      }
    }
  }
  
  // 8.4 Check for false dichotomy structures
  const falseDichotomyStructures = [
    /(either|it's either) (.*?) or (.*?)/i,
    /there (are|is) only two (choices|options|possibilities)/i,
    /you('re| are) either with (us|me) or against (us|me)/i,
    /if you('re| are) not (.*?), then you('re| are) (.*?)/i
  ];
  
  for (const sentence of sentences) {
    for (const pattern of falseDichotomyStructures) {
      if (pattern.test(sentence)) {
        score += 10;
        detectedPatterns.push("False dichotomy structure");
        break;
      }
    }
  }
  
  // 8.5 Check for passive voice hiding agency
  const passiveStructures = [
    /(was|were) (forced|made|told|ordered|instructed) to/i,
    /has been (hidden|suppressed|covered up|removed)/i,
    /(is|are|was|were) being (censored|silenced|hidden|manipulated)/i,
    /have been (lied to|misled|deceived)/i
  ];
  
  // Enhanced passive voice detection with more patterns
  const enhancedPassivePatterns = [
    // Basic passive constructions (be + past participle)
    /(is|are|was|were|be|been|being) (made|done|taken|given|shown|found|seen|called|known|used|left|kept|held|brought|set|put|sent|said|read|written)/i,
    
    // Extended participles with agency obscured
    /(is|are|was|were) (determined|reported|believed|understood|assumed|thought|alleged|claimed|suggested|acknowledged|decided)/i,
    
    // Passive with "by" where the agent is vague or institutional
    /(is|are|was|were|has been|have been) \w+ed by (some|many|most|authorities|officials|sources|experts|studies|research|the government|the media)/i,
    
    // "It is/was" constructions that hide agency
    /it (is|was) (decided|determined|reported|believed|understood|assumed|thought|suggested|noted|claimed|alleged|said|revealed|shown|found)/i,
    
    // Patterns with "to be" + participle
    /to be (considered|regarded|viewed|treated|seen|perceived|recognized|acknowledged)/i,
    
    // Get/Have/Make + participle patterns
    /(get|got|getting|gets) \w+ed/i,
    
    // Modal + be + participle
    /(can|could|may|might|must|should|will|would) be \w+ed/i,
    
    // Specifically target responsibility-avoiding phrases
    /mistakes were made/i,
    /errors occurred/i,
    /policies were implemented/i,
    /decisions were taken/i,
    /changes have been made/i,
    /actions were authorized/i,
    /information was withheld/i
  ];
  
  let passiveCount = 0;
  
  for (const sentence of sentences) {
    // Check original passive patterns
    let passiveFound = false;
    for (const pattern of passiveStructures) {
      if (pattern.test(sentence)) {
        passiveCount++;
        passiveInstances.push(sentence.trim());
        passiveFound = true;
        break;
      }
    }
    
    // Check enhanced passive patterns
    if (!passiveFound) { // Skip if already detected
      for (const pattern of enhancedPassivePatterns) {
        if (pattern.test(sentence)) {
          passiveCount++;
          passiveInstances.push(sentence.trim());
          break;
        }
      }
    }
  }
  
  // Calculate percentage of sentences using passive voice
  const passivePercentage = sentences.length > 0 ? (passiveCount / sentences.length) * 100 : 0;
  
  // Add scores based on both absolute count and percentage
  if (passiveCount >= 3 || passivePercentage >= 50) {
    score += 25;
    detectedPatterns.push(`Excessive passive voice (${passiveCount} instances, ${Math.round(passivePercentage)}% of text)`);
  } else if (passiveCount >= 2 || passivePercentage >= 30) {
    score += 15;
    detectedPatterns.push(`Significant passive voice use (${passiveCount} instances)`);
  } else if (passiveCount === 1 && sentences.length <= 3) {
    // Only flag as suspicious if it's a short text with passive voice
    score += 10;
    detectedPatterns.push("Passive voice hiding agency");
  }
  
  // 8.6 Check for rhetorical questions used manipulatively
  const rhetoricalQuestionStructures = [
    /why (aren't|don't|isn't|doesn't) (they|the media|the government|people)/i,
    /have you (ever (wondered|considered|thought)|been told)/i,
    /isn't it (strange|odd|curious|interesting|suspicious) that/i,
    /what if (everything|what) you (know|believe|were told) (is|was) (wrong|a lie|false)/i,
    /who (really|actually) (benefits|profits|gains) from/i,
    /how (can|could) (they|we|anyone) (possibly|really|actually)/i
  ];
  
  let rhetoricalCount = 0;
  for (const sentence of sentences) {
    for (const pattern of rhetoricalQuestionStructures) {
      if (pattern.test(sentence)) {
        rhetoricalCount++;
        break;
      }
    }
  }
  
  if (rhetoricalCount >= 2) {
    score += 20;
    detectedPatterns.push("Multiple rhetorical questions (manipulation tactic)");
  } else if (rhetoricalCount === 1) {
    score += 10;
    detectedPatterns.push("Rhetorical question pattern");
  }
  
  // Add some randomness for demonstration (smaller range)
  score += Math.floor(Math.random() * 10);
  
  return {
    score: Math.min(score, 100),
    patterns: detectedPatterns.slice(0, 3), // Return top 3 patterns
    passiveExamples: passiveInstances.length > 0 ? passiveInstances.slice(0, 3) : [] // Include up to 3 examples of passive voice
  };
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

// Extract domain from a URL
function extractDomain(url) {
  try {
    // Handle relative URLs (Twitter often uses these)
    if (url.startsWith('/')) {
      return 'twitter.com';
    }
    
    // Use URL API to parse URL
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    
    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain;
  } catch (e) {
    // If URL parsing fails, try a simple regex match
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (match && match[1]) {
      return match[1];
    }
    
    // If all else fails, return the original URL
    return url;
  }
}

// Score domain credibility
function scoreDomainCredibility(domain) {
  // Database of known domains and their credibility scores (0-100)
  const credibilityDatabase = {
    // High credibility news sources (80-100)
    'reuters.com': { score: 95, category: 'Established News Agency', description: 'International news organization known for factual reporting' },
    'apnews.com': { score: 95, category: 'Established News Agency', description: 'Associated Press - nonprofit news cooperative' },
    'bbc.com': { score: 90, category: 'Public Broadcasting', description: 'British public service broadcaster' },
    'bbc.co.uk': { score: 90, category: 'Public Broadcasting', description: 'British public service broadcaster' },
    'npr.org': { score: 88, category: 'Public Broadcasting', description: 'Nonprofit media organization' },
    'nytimes.com': { score: 85, category: 'Established Newspaper', description: 'Major American newspaper' },
    'washingtonpost.com': { score: 85, category: 'Established Newspaper', description: 'Major American newspaper' },
    'wsj.com': { score: 85, category: 'Established Newspaper', description: 'Wall Street Journal - business-focused daily newspaper' },
    'economist.com': { score: 88, category: 'Established Magazine', description: 'Weekly newspaper focusing on current affairs, business and politics' },
    'nature.com': { score: 95, category: 'Scientific Journal', description: 'Prestigious scientific journal' },
    'science.org': { score: 95, category: 'Scientific Journal', description: 'Prestigious scientific journal' },
    'nejm.org': { score: 95, category: 'Scientific Journal', description: 'New England Journal of Medicine - peer-reviewed medical journal' },
    'pnas.org': { score: 90, category: 'Scientific Journal', description: 'Proceedings of the National Academy of Sciences - peer-reviewed journal' },
    'who.int': { score: 90, category: 'International Organization', description: 'World Health Organization' },
    'un.org': { score: 85, category: 'International Organization', description: 'United Nations' },
    'europa.eu': { score: 85, category: 'Government', description: 'European Union official website' },
    'cdc.gov': { score: 90, category: 'Government', description: 'Centers for Disease Control and Prevention' },
    'nih.gov': { score: 90, category: 'Government', description: 'National Institutes of Health' },
    'nasa.gov': { score: 90, category: 'Government', description: 'National Aeronautics and Space Administration' },
    'noaa.gov': { score: 90, category: 'Government', description: 'National Oceanic and Atmospheric Administration' },
    
    // Medium credibility sources (50-79)
    'foxnews.com': { score: 65, category: 'Cable News', description: 'American conservative cable news channel' },
    'cnn.com': { score: 70, category: 'Cable News', description: 'American cable news channel' },
    'usatoday.com': { score: 75, category: 'Established Newspaper', description: 'American daily newspaper' },
    'thehill.com': { score: 75, category: 'Political News', description: 'Political reporting focused on Congress, lobbying and politics' },
    'politico.com': { score: 75, category: 'Political News', description: 'Political journalism organization' },
    'time.com': { score: 78, category: 'Established Magazine', description: 'News magazine and website' },
    'forbes.com': { score: 72, category: 'Business Magazine', description: 'American business magazine' },
    'bloomberg.com': { score: 80, category: 'Business News', description: 'Financial, software, data, and media company' },
    'businessinsider.com': { score: 68, category: 'Business News', description: 'American financial and business news website' },
    'independent.co.uk': { score: 75, category: 'Established Newspaper', description: 'British online newspaper' },
    'theguardian.com': { score: 80, category: 'Established Newspaper', description: 'British daily newspaper' },
    'huffpost.com': { score: 65, category: 'Online News', description: 'American news aggregator and blog' },
    'medium.com': { score: 50, category: 'User-Generated Content', description: 'Online publishing platform' },
    
    // Low credibility sources (0-49)
    'breitbart.com': { score: 35, category: 'Partisan News', description: 'American far-right news site' },
    'dailymail.co.uk': { score: 40, category: 'Tabloid', description: 'British tabloid newspaper' },
    'thesun.co.uk': { score: 35, category: 'Tabloid', description: 'British tabloid newspaper' },
    'nypost.com': { score: 45, category: 'Tabloid', description: 'American newspaper' },
    'rt.com': { score: 30, category: 'State-Controlled Media', description: 'Russian state-controlled broadcaster' },
    'sputniknews.com': { score: 30, category: 'State-Controlled Media', description: 'Russian state-owned news agency' },
    'infowars.com': { score: 15, category: 'Conspiracy', description: 'American far-right conspiracy theory and fake news website' },
    'naturalnews.com': { score: 20, category: 'Pseudoscience', description: 'Website promoting health conspiracies' },
    'zerohedge.com': { score: 30, category: 'Conspiracy', description: 'Financial blog that promotes conspiracy theories' },
    'beforeitsnews.com': { score: 10, category: 'Conspiracy', description: 'User-generated conspiracy website' },
    'theepochtimes.com': { score: 35, category: 'Partisan News', description: 'Far-right media organization' },
    'oann.com': { score: 30, category: 'Partisan News', description: 'One America News Network - far-right news channel' },
    'newsmax.com': { score: 35, category: 'Partisan News', description: 'Conservative news media organization' },
    
    // URL shorteners and social media (considered suspicious due to obscuring the real source)
    'bit.ly': { score: 30, category: 'URL Shortener', description: 'Hides actual source URL' },
    'tinyurl.com': { score: 30, category: 'URL Shortener', description: 'Hides actual source URL' },
    'goo.gl': { score: 30, category: 'URL Shortener', description: 'Hides actual source URL' },
    't.co': { score: 40, category: 'Twitter URL Shortener', description: 'Twitter\'s URL shortener' },
    'twitter.com': { score: 50, category: 'Social Media', description: 'Social media platform' },
    'x.com': { score: 50, category: 'Social Media', description: 'Social media platform' },
    'facebook.com': { score: 45, category: 'Social Media', description: 'Social media platform' },
    'instagram.com': { score: 45, category: 'Social Media', description: 'Social media platform' },
    'tiktok.com': { score: 40, category: 'Social Media', description: 'Social media platform' },
    'youtube.com': { score: 50, category: 'Video Sharing', description: 'Video sharing platform' },
    'youtu.be': { score: 50, category: 'Video Sharing', description: 'YouTube URL shortener' },
    'reddit.com': { score: 45, category: 'Social Media', description: 'Social news aggregation and discussion website' }
  };
  
  // Check if the domain exists in our database
  if (credibilityDatabase[domain]) {
    return credibilityDatabase[domain];
  }
  
  // Check for domain endings
  if (domain.endsWith('.edu')) {
    return { score: 80, category: 'Educational Institution', description: 'Educational domain' };
  } else if (domain.endsWith('.gov')) {
    return { score: 80, category: 'Government', description: 'Government domain' };
  } else if (domain.endsWith('.org')) {
    return { score: 65, category: 'Organization', description: 'Organization domain - varying credibility' };
  }
  
  // If not found, return a default unknown score
  return { score: 40, category: 'Unknown', description: 'Unverified source' };
}

// Analyze sources in a tweet
function analyzeSourcesInTweet(tweetElement) {
  // Collect all links in the tweet
  const linkElements = tweetElement.querySelectorAll('a[href]');
  if (linkElements.length === 0) {
    return {
      sourcesFound: false,
      credibilityScore: 50, // Neutral score if no sources
      sourceDetails: []
    };
  }
  
  let totalScore = 0;
  const sourceDetails = [];
  let sourcesFound = false;
  
  // Process each link
  linkElements.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Skip profile links and hashtags
    if (href.startsWith('/') && !href.includes('/status/')) {
      return;
    }
    
    // Extract domain and score it
    const domain = extractDomain(href);
    const credibilityInfo = scoreDomainCredibility(domain);
    
    // Add to source details
    sourceDetails.push({
      domain: domain,
      url: href,
      ...credibilityInfo
    });
    
    // Update total score
    totalScore += credibilityInfo.score;
    sourcesFound = true;
  });
  
  // Calculate average score if sources were found
  const credibilityScore = sourcesFound ? Math.round(totalScore / sourceDetails.length) : 50;
  
  return {
    sourcesFound,
    credibilityScore,
    sourceDetails
  };
}

// Initialize scroll detection when the page is fully loaded
window.addEventListener('load', () => {
  // Give the page a moment to fully render
  setTimeout(setupScrollDetection, 1000);
}); 