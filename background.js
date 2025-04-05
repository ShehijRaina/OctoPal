// OctoPal background script
console.log('OctoPal: Background script loaded');

// Initialize user data on installation
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage with default values
  chrome.storage.local.set({
    reports: [],
    userStats: {
      reportsSubmitted: 0
    }
  });
  
  console.log('OctoPal: Extension installed');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle report submission
  if (request.action === "report") {
    handleReport(request, sendResponse);
    return true; // Will respond asynchronously
  }
});

// Handle a user reporting content
async function handleReport(request, sendResponse) {
  try {
    // Get existing reports from storage
    chrome.storage.local.get(['reports', 'userStats'], function(data) {
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
      
      // Save updated data
      chrome.storage.local.set({
        reports: reports,
        userStats: userStats
      }, function() {
        // Notify any tabs that might be displaying stats
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "reportSubmitted",
              stats: userStats
            });
          }
          
          // Once everything is saved, respond to the original request
          sendResponse({ success: true });
        });
      });
    });
  } catch (error) {
    console.error('OctoPal: Error handling report', error);
    sendResponse({ success: false });
  }
} 