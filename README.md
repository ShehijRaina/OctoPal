# BotSpotter 🤖

A simple browser extension that helps identify potential bots and misinformation on Twitter/X.

## Features

- **Bot Detection**: Analyze Twitter accounts for potential bot-like behavior
- **Misinformation Flagging**: Check posts for potential misleading content
- **Reporting**: Submit reports of suspected bots or misinformation

## How It Works

This extension uses simple heuristics to estimate the likelihood that a Twitter account is a bot or if content might be misinformation:

### Bot Detection Signals
- Username patterns (random characters, lots of numbers)
- Verification status
- Posting frequency patterns

### Misinformation Signals
- Excessive capitalization
- Overuse of exclamation marks
- Keywords often associated with false content
- Excessive hashtag usage

## Setup

This is a basic browser extension with no build process required.

### Installation in Chrome

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the folder containing this extension

### Installation in Firefox

1. Download or clone this repository
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to the extension folder and select any file (like `manifest.json`)

## Usage

1. Visit Twitter/X
2. Click the BotSpotter icon in your browser toolbar
3. View the analysis of the current page
4. If you find content you suspect is bot-generated or misinformation, click "Report"

## Project Structure

- `manifest.json` - Extension configuration
- `popup.html` - The UI that appears when clicking the extension icon
- `popup.js` - Controls the popup behavior
- `content.js` - Analyzes the content on Twitter pages
- `background.js` - Manages data storage and coordination

## Next Steps

This is a simplified version. Future improvements could include:
- More sophisticated bot detection algorithms
- Integration with fact-checking APIs
- User interface enhancements
- Support for more social media platforms
- Gamification features

## License

This project is licensed under the MIT License - see the LICENSE file for details. 