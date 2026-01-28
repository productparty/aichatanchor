# Bookmark ChatGPT Responses - Pin & Save AI Chat | Claude, Gemini

Bookmark ChatGPT responses and pin important AI chat messages. Jump back to any saved response instantly. Works with Claude and Gemini too.

## The Problem

You're deep into a conversation with Claude, ChatGPT, or Gemini. Somewhere around response #8, you got exactly the answer you needed. Now it's response #23 and you need that info again. Your options:

1. **Scroll endlessly** hoping to spot it
2. **Ctrl+F** with keywords you half-remember
3. **Re-prompt**: "Hey, what was that thing you said earlier about..."
4. **Give up** and start a new chat

None of these are great. The irony of option 3 is real—you're burning time or tokens asking the AI to repeat itself because there's no way to navigate the conversation.

## The Solution

Stop scrolling through long AI conversations looking for that one answer you need. Pin any response with one click, add an optional label, and find it later in your bookmark library.

Hover over any AI response to see the pin button. Click to bookmark it. Open the extension popup to browse all your saved responses. Click any pin to jump right back.

**Key principles:**
- **Privacy first** — All bookmarks stay in your browser. Nothing is uploaded, tracked, or shared
- **100% local** — No cloud, no account, no data collection
- **Works across platforms** — One library for ChatGPT, Claude, and Gemini

## Features

- **Pin any AI response** in ChatGPT, Claude, or Gemini
- **Add labels** to organize your saved messages
- **Jump directly** to bookmarked responses with one click
- **Filter pins** by source, time, or tags
- **Export and import** your bookmarks as JSON
- **100% local** — no cloud, no account, no data collection

## Supported Platforms

- [claude.ai](https://claude.ai)
- [chat.openai.com](https://chat.openai.com) / [chatgpt.com](https://chatgpt.com)
- [gemini.google.com](https://gemini.google.com)

## Installation

### From GitHub Release

1. Download the latest `aichatanchor-x.x.x.zip` from [Releases](https://github.com/productparty/aichatanchor/releases)

2. Unzip the file to a folder on your computer

3. Open your browser's extension page:
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`

4. Enable **Developer mode** (toggle in the top right corner)

5. Click **Load unpacked** and select the unzipped `aichatanchor` folder

6. Pin the extension to your toolbar for easy access

### From Source (Developer)

1. Clone this repo:
   ```bash
   git clone https://github.com/productparty/aichatanchor.git
   ```

2. Follow steps 3-6 above, selecting the cloned folder

## How to Use

1. **Visit** any supported AI chat (Claude, ChatGPT, Gemini)
2. **Hover** over an AI response to see the pin button
3. **Click** the pin icon, optionally add a label, hit Enter
4. **Later**, click the extension icon to see your inventory
5. **Click** any pin to jump back to that exact response

## Privacy

This extension:
- Stores all data locally in your browser
- Works completely offline after installation
- Has no analytics, tracking, or telemetry
- Never sends your data anywhere
- Has no account or sign-up
- Cannot read or store the actual content of responses

Your pins are yours. Export them anytime as a JSON backup.

## Contributing

Contributions welcome! This is a straightforward browser extension, so it's a good project if you're learning extension development.

**Areas that could use help:**
- Selector maintenance (AI sites update their DOM frequently)
- Adding support for more LLM products (Perplexity, Poe, etc.)
- UI/UX improvements to the popup
- Testing across different browsers

### Development Setup

1. Fork and clone the repo
2. Load unpacked in your browser (see Installation)
3. Make changes — the content scripts reload when you refresh the AI chat page
4. For popup changes, right-click the extension icon and select "Inspect popup"

### Selector Updates

The trickiest part of this extension is keeping up with DOM changes on each AI site. If pins stop appearing:

1. Inspect the AI response elements on the affected site
2. Update the selectors in the relevant content script (`claude.js`, `chatgpt.js`, or `gemini.js`)
3. Submit a PR with your findings

## License

MIT

## Acknowledgments

Built with the help of Claude.

---

**Found this useful?** Star the repo and share it with others who are tired of scrolling through AI conversations.
