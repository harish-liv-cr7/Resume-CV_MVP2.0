// Background script for Cover Letter Generator extension

let appTabId = null;
const APP_URL = chrome.runtime.getURL('app.html');

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if app tab already exists
    if (appTabId) {
      try {
        const existingTab = await chrome.tabs.get(appTabId);
        if (existingTab && existingTab.url === APP_URL) {
          // Focus existing tab
          await chrome.tabs.update(appTabId, { active: true });
          await chrome.windows.update(existingTab.windowId, { focused: true });
          return;
        }
      } catch (error) {
        // Tab no longer exists, clear the reference
        appTabId = null;
      }
    }
    
    // Create new app tab
    const newTab = await chrome.tabs.create({
      url: APP_URL,
      active: true
    });
    
    appTabId = newTab.id;
    
  } catch (error) {
    console.error('Error opening cover letter generator:', error);
  }
});

// Clean up tab reference when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null;
  }
});

// Handle tab updates to maintain reference
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === appTabId && changeInfo.url && changeInfo.url !== APP_URL) {
    // User navigated away from app, clear reference
    appTabId = null;
  }
});

console.log('Cover Letter Generator background script loaded');
