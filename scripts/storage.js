/**
 * AI Chat Anchor - Storage Module
 * Shared storage logic for managing pins across the extension
 */

const PinStorage = (function () {
    'use strict';

    return {
        /**
         * Get all pins from storage
         */
        async getAll() {
            const result = await chrome.storage.local.get('pins');
            return result.pins || { claude: {}, chatgpt: {}, gemini: {} };
        },

        /**
         * Get pins for a specific product and chat
         */
        async getPinsForChat(product, chatId) {
            const allPins = await this.getAll();
            return allPins[product]?.[chatId] || [];
        },

        /**
         * Save a new pin
         */
        async savePin(pin) {
            const allPins = await this.getAll();

            if (!allPins[pin.product]) {
                allPins[pin.product] = {};
            }
            if (!allPins[pin.product][pin.chatId]) {
                allPins[pin.product][pin.chatId] = [];
            }

            allPins[pin.product][pin.chatId].push(pin);
            await chrome.storage.local.set({ pins: allPins });
            return pin;
        },

        /**
         * Delete a pin
         */
        async deletePin(product, chatId, pinId) {
            const allPins = await this.getAll();

            if (allPins[product]?.[chatId]) {
                allPins[product][chatId] = allPins[product][chatId].filter(p => p.id !== pinId);

                // Clean up empty chat entries
                if (allPins[product][chatId].length === 0) {
                    delete allPins[product][chatId];
                }

                await chrome.storage.local.set({ pins: allPins });
            }
        },

        /**
         * Determine the next pin number for a chat
         */
        async getNextPinNumber(product, chatId) {
            const pins = await this.getPinsForChat(product, chatId);
            if (pins.length === 0) return 1;
            return Math.max(...pins.map(p => p.pinNumber)) + 1;
        },

        /**
         * Check if a specific response index is already pinned
         */
        async isPinned(product, chatId, responseIndex) {
            const pins = await this.getPinsForChat(product, chatId);
            return pins.find(p => p.responseIndex === responseIndex);
        },

        /**
         * Update an existing pin (e.g. for description/tags)
         */
        async updatePin(product, chatId, pinId, updates) {
            const allPins = await this.getAll();

            if (allPins[product]?.[chatId]) {
                const pinIndex = allPins[product][chatId].findIndex(p => p.id === pinId);
                if (pinIndex !== -1) {
                    allPins[product][chatId][pinIndex] = {
                        ...allPins[product][chatId][pinIndex],
                        ...updates
                    };
                    await chrome.storage.local.set({ pins: allPins });
                    return allPins[product][chatId][pinIndex];
                }
            }
            return null;
        }
    };
})();

// Export for module environments if needed, but primarily used as global
if (typeof window !== 'undefined') {
    window.PinStorage = PinStorage;
}
