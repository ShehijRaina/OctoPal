// BotSpotter content script
console.log('BotSpotter: Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "analyze") {
    // Perform analysis of the current page
    analyzeCurrentPage().then(results => {
      // Send results back to popup
      sendResponse({
        success: true,
        botScore: results.botScore,
        misinfoScore: results.misinfoScore
      });
    }).catch(error => {
      console.error('BotSpotter: Error analyzing page', error);
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
  
  const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
  let botScoreTotal = 0;
  let misinfoScoreTotal = 0;
  
  // If no tweets found, return default scores
  if (tweetElements.length === 0) {
    return {
      botScore: 0,
      misinfoScore: 0
    };
  }
  
  // Analyze each tweet
  tweetElements.forEach(tweet => {
    // Analyze for bot-like patterns
    botScoreTotal += analyzeTweetForBotPatterns(tweet);
    
    // Analyze for misinformation patterns
    misinfoScoreTotal += analyzeTweetForMisinformation(tweet);
  });
  
  // Calculate average scores
  const botScore = Math.min(Math.round(botScoreTotal / tweetElements.length), 100);
  const misinfoScore = Math.min(Math.round(misinfoScoreTotal / tweetElements.length), 100);
  
  return {
    botScore,
    misinfoScore
  };
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
  }
  
  // 3. Check posting frequency (placeholder)
  // This would normally check timestamp patterns
  if (Math.random() < 0.2) {
    score += 20; // Simulate "high frequency posting" detection
  }
  
  // 4. Check for verified status (less likely to be bots)
  const verifiedBadge = tweetElement.querySelector('[data-testid="icon-verified"]');
  if (!verifiedBadge) {
    score += 10;
  }
  
  // Add some randomness for demonstration
  score += Math.floor(Math.random() * 15);
  
  return Math.min(score, 100);
}

// Simple misinformation detection logic (very basic for demonstration)
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
    'fake news'
  ];
  
  misinfoKeywords.forEach(keyword => {
    if (tweetText.toLowerCase().includes(keyword)) {
      score += 15;
      return; // Only add the score once
    }
  });
  
  // 4. Check for many hashtags (sometimes indicates spam/misinfo campaigns)
  const hashtagCount = (tweetText.match(/#\w+/g) || []).length;
  if (hashtagCount > 3) {
    score += 10;
  }
  
  // Add some randomness for demonstration
  score += Math.floor(Math.random() * 15);
  
  return Math.min(score, 100);
} 