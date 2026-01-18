/**
 * AI Chat Anchor - Dashboard Script
 */

(function () {
    'use strict';

    // State
    let allPins = [];
    let currentProductFilter = 'all'; // all, claude, chatgpt, gemini
    let currentTimeFilter = 'allTime'; // allTime, today, yesterday, week, month, lastMonth, year
    let selectedTags = []; // Array of selected tag strings
    let searchQuery = '';
    let selectedPinId = null;
    let sortOrder = 'newest'; // newest, oldest, titleAsc, titleDesc

    // DOM Elements
    const pinsGrid = document.getElementById('pins-grid');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('global-search');
    const detailPanel = document.getElementById('detail-panel');
    const detailContent = document.getElementById('detail-content-form');
    const navItems = document.querySelectorAll('.nav-item');

    // ============================================
    // INIT & LOAD
    // ============================================

    async function init() {
        console.log('[Dashboard] Initializing...');
        console.log('[Dashboard] PinStorage available:', typeof window.PinStorage !== 'undefined');
        
        await loadData();
        renderTagFilters();
        setupEventListeners();
        render();
        
        console.log('[Dashboard] Initialization complete. Pins count:', allPins.length);
    }

    // ============================================
    // TAG FILTERS
    // ============================================

    function getAllTags() {
        const tagSet = new Set();
        allPins.forEach(pin => {
            if (pin.tags && Array.isArray(pin.tags)) {
                pin.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tagSet.add(tag.trim());
                    }
                });
            }
        });
        return Array.from(tagSet).sort();
    }

    function getTagCounts() {
        const counts = {};
        allPins.forEach(pin => {
            if (pin.tags && Array.isArray(pin.tags)) {
                pin.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        const normalized = tag.trim().toLowerCase();
                        counts[normalized] = (counts[normalized] || 0) + 1;
                    }
                });
            }
        });
        return counts;
    }

    function renderTagFilters() {
        const tagsContainer = document.getElementById('tags-container');
        if (!tagsContainer) return;

        const tags = getAllTags();
        const tagCounts = getTagCounts();

        if (tags.length === 0) {
            tagsContainer.innerHTML = '<div class="tags-empty">No tags yet</div>';
            return;
        }

        tagsContainer.innerHTML = tags.map(tag => {
            const normalized = tag.toLowerCase();
            const count = tagCounts[normalized] || 0;
            const isSelected = selectedTags.includes(normalized);
            return `
                <button class="tag-filter ${isSelected ? 'active' : ''}" 
                        data-tag="${escapeHtml(tag)}"
                        title="${count} pin${count !== 1 ? 's' : ''}">
                    <span class="tag-name">${escapeHtml(tag)}</span>
                    <span class="tag-count">${count}</span>
                </button>
            `;
        }).join('');

        // Add click handlers
        tagsContainer.querySelectorAll('.tag-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                const normalized = tag.toLowerCase();
                
                if (selectedTags.includes(normalized)) {
                    selectedTags = selectedTags.filter(t => t !== normalized);
                } else {
                    selectedTags.push(normalized);
                }
                
                renderTagFilters();
                render();
            });
        });
    }

    async function loadData() {
        try {
            // Check if PinStorage is available
            if (!window.PinStorage) {
                console.error('[Dashboard] PinStorage not available. Check if storage.js is loaded.');
                return;
            }

            const rawData = await window.PinStorage.getAll();
            console.log('[Dashboard] Raw data from storage:', rawData);
            allPins = flattenPins(rawData);
            console.log('[Dashboard] Loaded pins:', allPins.length);
            console.log('[Dashboard] Pins array:', allPins);
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
        }
    }

    function flattenPins(rawData) {
        const flat = [];
        
        if (!rawData || typeof rawData !== 'object') {
            console.warn('[Dashboard] Invalid rawData format:', rawData);
            return flat;
        }

        ['claude', 'chatgpt', 'gemini'].forEach(product => {
            const chatMap = rawData[product] || {};
            if (typeof chatMap !== 'object') {
                console.warn(`[Dashboard] Invalid chatMap for ${product}:`, chatMap);
                return;
            }
            
            Object.keys(chatMap).forEach(chatId => {
                const pins = chatMap[chatId];
                if (!Array.isArray(pins)) {
                    console.warn(`[Dashboard] Pins for ${product}/${chatId} is not an array:`, pins);
                    return;
                }
                
                pins.forEach(pin => {
                    if (pin && typeof pin === 'object') {
                        flat.push({ ...pin, product, chatId });
                    }
                });
            });
        });
        
        // Sort Newest -> Oldest
        return flat.sort((a, b) => {
            const aTime = a.createdAt || 0;
            const bTime = b.createdAt || 0;
            return bTime - aTime;
        });
    }

    // ============================================
    // RENDER GRID
    // ============================================

    function render() {
        // 1. Filter
        let filtered = allPins.filter(pin => {
            // Product filter
            if (currentProductFilter !== 'all' && pin.product !== currentProductFilter) {
                return false;
            }

            // Time filter
            if (currentTimeFilter !== 'allTime') {
                const now = Date.now();
                const pinTime = pin.createdAt || 0;
                const oneDay = 24 * 60 * 60 * 1000;
                const oneWeek = 7 * oneDay;
                
                // Get start of today
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayStartTime = todayStart.getTime();
                
                // Get start of yesterday
                const yesterdayStart = new Date(todayStartTime - oneDay);
                const yesterdayStartTime = yesterdayStart.getTime();
                
                // Get start of current month
                const thisMonthStart = new Date();
                thisMonthStart.setDate(1);
                thisMonthStart.setHours(0, 0, 0, 0);
                const thisMonthStartTime = thisMonthStart.getTime();
                
                // Get start of last month
                const lastMonthStart = new Date(thisMonthStartTime);
                lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
                const lastMonthStartTime = lastMonthStart.getTime();
                
                // Get start of current year
                const thisYearStart = new Date();
                thisYearStart.setMonth(0, 1);
                thisYearStart.setHours(0, 0, 0, 0);
                const thisYearStartTime = thisYearStart.getTime();

                switch (currentTimeFilter) {
                    case 'today':
                        if (pinTime < todayStartTime) return false;
                        break;
                    case 'yesterday':
                        if (pinTime < yesterdayStartTime || pinTime >= todayStartTime) return false;
                        break;
                    case 'week':
                        if (now - pinTime > oneWeek) return false;
                        break;
                    case 'month':
                        if (pinTime < thisMonthStartTime) return false;
                        break;
                    case 'lastMonth':
                        if (pinTime < lastMonthStartTime || pinTime >= thisMonthStartTime) return false;
                        break;
                    case 'year':
                        if (pinTime < thisYearStartTime) return false;
                        break;
                }
            }

            // Tag filter - pin must have at least one selected tag (if any tags are selected)
            if (selectedTags.length > 0) {
                const pinTags = (pin.tags || []).map(t => t.toLowerCase());
                const hasSelectedTag = selectedTags.some(selectedTag => 
                    pinTags.includes(selectedTag.toLowerCase())
                );
                if (!hasSelectedTag) return false;
            }

            // Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const text = [
                    pin.label,
                    pin.description,
                    pin.chatTitle,
                    (pin.tags || []).join(' ')
                ].join(' ').toLowerCase();

                if (!text.includes(q)) return false;
            }

            return true;
        });

        // 2. Sort
        filtered.sort((a, b) => {
            switch (sortOrder) {
                case 'newest':
                    return (b.createdAt || 0) - (a.createdAt || 0);
                case 'oldest':
                    return (a.createdAt || 0) - (b.createdAt || 0);
                case 'titleAsc':
                    const titleA = (a.chatTitle || '').toLowerCase();
                    const titleB = (b.chatTitle || '').toLowerCase();
                    return titleA.localeCompare(titleB);
                case 'titleDesc':
                    const titleA2 = (a.chatTitle || '').toLowerCase();
                    const titleB2 = (b.chatTitle || '').toLowerCase();
                    return titleB2.localeCompare(titleA2);
                default:
                    return (b.createdAt || 0) - (a.createdAt || 0);
            }
        });

        // 3. Render
        pinsGrid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');

        filtered.forEach(pin => {
            const card = createPinCard(pin);
            pinsGrid.appendChild(card);
        });
    }

    function createPinCard(pin) {
        const el = document.createElement('div');
        el.className = `pin-card ${selectedPinId === pin.id ? 'selected' : ''}`;
        el.onclick = () => selectPin(pin);

        // Date formatting
        const dateStr = new Date(pin.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        const tagsHtml = (pin.tags && pin.tags.length > 0) 
            ? `<div class="pin-tags">${pin.tags.slice(0, 3).map(tag => `<span class="pin-tag">${escapeHtml(tag)}</span>`).join('')}${pin.tags.length > 3 ? `<span class="pin-tag-more">+${pin.tags.length - 3}</span>` : ''}</div>`
            : '';

        el.innerHTML = `
      <div class="card-header">
        <span class="pin-product-badge">${pin.product}</span>
        <span class="pin-number">#${pin.pinNumber}</span>
      </div>
      <div class="pin-layout-title">${escapeHtml(pin.chatTitle || 'Untitled Chat')}</div>
      <div class="pin-layout-subtitle">${escapeHtml(pin.label || 'No label')}</div>
      ${tagsHtml}
      <div class="pin-date">${dateStr}</div>
    `;
        return el;
    }

    // ============================================
    // DETAIL PANEL
    // ============================================

    function selectPin(pin) {
        selectedPinId = pin.id;
        detailPanel.classList.remove('hidden');
        renderDetail(pin);
        render(); // Re-render grid to update selection state
    }

    function renderDetail(pin) {
        const tagsVal = Array.isArray(pin.tags) ? pin.tags.join(', ') : '';
        const descVal = pin.description || '';

        detailContent.innerHTML = `
      <form id="edit-form">
        <div class="form-group">
          <label class="form-label">Label</label>
          <input type="text" class="form-input" id="edit-label" value="${escapeHtml(pin.label || '')}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input form-textarea" id="edit-desc" placeholder="Add notes...">${escapeHtml(descVal)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tags (comma separated)</label>
          <input type="text" class="form-input" id="edit-tags" value="${escapeHtml(tagsVal)}" placeholder="react, debug, important">
        </div>

        <button type="submit" class="btn-primary">Save Changes</button>
        <button type="button" class="btn-primary btn-delete" id="btn-delete-pin">Delete Pin</button>
      </form>

      <div class="detail-meta">
        <div class="meta-row"><span>Chat</span> <span>${escapeHtml(pin.chatTitle || 'Untitled')}</span></div>
        <div class="meta-row"><span>Created</span> <span>${new Date(pin.createdAt).toLocaleString()}</span></div>
        <div class="meta-row"><span>ID</span> <span>${pin.id}</span></div>
        <div class="meta-row" style="margin-top:10px">
          <a href="${pin.chatUrl}" target="_blank" style="color:var(--accent)">Open Chat ↗</a>
        </div>
      </div>
    `;

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const newLabel = document.getElementById('edit-label').value;
            const newDesc = document.getElementById('edit-desc').value;
            const newTags = document.getElementById('edit-tags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t);

            // Save
            await window.PinStorage.updatePin(pin.product, pin.chatId, pin.id, {
                label: newLabel,
                description: newDesc,
                tags: newTags
            });

            // Reload
            await loadData();
            renderTagFilters();
            render();

            // Flash success?
            const btn = e.target.querySelector('button[type="submit"]');
            const origText = btn.textContent;
            btn.textContent = 'Saved!';
            setTimeout(() => btn.textContent = origText, 1500);
        };

        document.getElementById('btn-delete-pin').onclick = async () => {
            if (confirm('Are you sure you want to delete this pin?')) {
                await window.PinStorage.deletePin(pin.product, pin.chatId, pin.id);
                selectedPinId = null;
                detailPanel.classList.add('hidden');
                await loadData();
                renderTagFilters();
                render();
            }
        };
    }

    document.getElementById('close-detail').onclick = () => {
        detailPanel.classList.add('hidden');
        selectedPinId = null;
        render();
    };

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function setupEventListeners() {
        // Search
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            render();
        });

        // Filters - separate product and time filters
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const filter = item.dataset.filter;
                
                // Determine filter type based on which section it's in
                const navSection = item.closest('.nav-section');
                const sectionLabel = navSection?.querySelector('.nav-label')?.textContent?.trim();
                
                if (sectionLabel === 'LIBRARY' || sectionLabel === 'Library') {
                    // Product filter section
                    navItems.forEach(n => {
                        const nSection = n.closest('.nav-section');
                        const nLabel = nSection?.querySelector('.nav-label')?.textContent?.trim();
                        if (nLabel === 'LIBRARY' || nLabel === 'Library') {
                            n.classList.remove('active');
                        }
                    });
                    item.classList.add('active');
                    currentProductFilter = filter === 'all' ? 'all' : filter;
                } else if (sectionLabel === 'SOURCE' || sectionLabel === 'Source') {
                    // Product filter section
                    navItems.forEach(n => {
                        const nSection = n.closest('.nav-section');
                        const nLabel = nSection?.querySelector('.nav-label')?.textContent?.trim();
                        if (nLabel === 'SOURCE' || nLabel === 'Source') {
                            n.classList.remove('active');
                        }
                    });
                    item.classList.add('active');
                    currentProductFilter = filter;
                } else if (sectionLabel === 'TIME' || sectionLabel === 'Time') {
                    // Time filter section
                    navItems.forEach(n => {
                        const nSection = n.closest('.nav-section');
                        const nLabel = nSection?.querySelector('.nav-label')?.textContent?.trim();
                        if (nLabel === 'TIME' || nLabel === 'Time') {
                            n.classList.remove('active');
                        }
                    });
                    item.classList.add('active');
                    currentTimeFilter = filter;
                }
                
                render();
            });
        });

        // View Controls (Grid/List toggle)
        document.getElementById('view-grid').onclick = () => {
            document.getElementById('view-list').classList.remove('active');
            document.getElementById('view-grid').classList.add('active');
            pinsGrid.classList.remove('list-view');
        };

        document.getElementById('view-list').onclick = () => {
            document.getElementById('view-grid').classList.remove('active');
            document.getElementById('view-list').classList.add('active');
            pinsGrid.classList.add('list-view');
        };

        // Sort control
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                sortOrder = e.target.value;
                render();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                console.log('[Dashboard] Manual refresh triggered');
                await loadData();
                renderTagFilters();
                render();
            };
        }

        // Export button (placeholder for now)
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.onclick = async () => {
                const data = await window.PinStorage.getAll();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pins-export-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        // Auto-refresh when storage changes in other windows
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.pins) {
                console.log('[Dashboard] Storage changed, reloading...');
                loadData().then(() => {
                    renderTagFilters();
                    render();
                });
            }
        });

        // Also try direct storage access as fallback
        chrome.storage.local.get('pins', (result) => {
            console.log('[Dashboard] Direct storage check:', result);
            if (result.pins && Object.keys(result.pins).length > 0) {
                console.log('[Dashboard] Found pins in direct storage access');
            } else {
                console.warn('[Dashboard] No pins found in direct storage access');
            }
        });
    }

    // Utilities
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Run - wait for PinStorage to be available
    function waitForPinStorage() {
        return new Promise((resolve) => {
            if (window.PinStorage) {
                resolve();
            } else {
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.PinStorage) {
                        clearInterval(checkInterval);
                        resolve();
                    } else if (attempts > 50) {
                        // 5 seconds timeout
                        clearInterval(checkInterval);
                        console.error('[Dashboard] PinStorage not available after 5 seconds');
                        resolve(); // Continue anyway to show error
                    }
                }, 100);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await waitForPinStorage();
        init();
    });

})();
