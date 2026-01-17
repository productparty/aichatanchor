# AI Chat Anchor

A browser extension that lets you bookmark specific responses in AI chat conversations and jump back to them instantly.

## The Problem

You're deep into a conversation with Claude, ChatGPT, or Gemini. Somewhere around response #8, you got exactly the answer you needed. Now it's response #23 and you need that info again. Your options:

1. **Scroll endlessly** hoping to spot it
2. **Ctrl+F** with keywords you half-remember
3. **Re-prompt**: "Hey, what was that thing you said earlier about..."
4. **Give up** and start a new chat

None of these are great. The irony of option 3 is real—you're burning tokens asking the AI to repeat itself because there's no way to navigate the conversation.

## The Solution

AI Chat Anchor adds a simple pin button to AI responses. Click it, optionally add a label, and you've got a bookmark. All your pins are stored locally and accessible from the extension popup, organized by chat and product. Click any pin to jump right back to that moment in the conversation.

**Key principles:**
- **Anchors, not archives** — Pins mark locations, they don't store content
- **Fully local** — Nothing leaves your browser. No accounts, no cloud, no tracking
- **Works across products** — One inventory for Claude, ChatGPT, and Gemini

## Features

- **Pin any AI response** with one click
- **Optional labels** to remind yourself why it matters
- **Auto-numbered** pins per conversation (#1, #2, #3...)
- **Inventory popup** showing all pins grouped by product and chat
- **Jump to pin** — Opens the chat and scrolls right to that response
- **Privacy-first** — All data stays in your browser's local storage

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

Your pins are yours.

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
