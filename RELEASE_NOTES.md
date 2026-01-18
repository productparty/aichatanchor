# Release Notes - v1.0.4

## Dashboard UI Overhaul & Enhanced Filtering

This release brings significant improvements to the dashboard experience with better UI, comprehensive filtering, sorting, and tag management.

### 🎨 UI/UX Improvements

- **Fixed Dashboard Layout Issues**
  - Resolved empty state overlapping with pin cards
  - Fixed pin cards not displaying properly
  - Improved empty state styling and positioning
  - Added proper z-index management for layered elements

- **Enhanced Sidebar**
  - Updated header to display full name "AI Chat Anchor"
  - Added attribution footer: "Built with ♥ by Mike Watson @ Product Party"
  - Improved visual hierarchy and spacing

### 🔍 Advanced Filtering & Sorting

- **Expanded Time Filters**
  - All Time (default)
  - Today
  - Yesterday
  - Last 7 Days
  - This Month
  - Last Month
  - This Year
  - Proper date boundary calculations for accurate filtering

- **Product Filters**
  - All Pins
  - Filter by Claude, ChatGPT, or Gemini
  - Works independently with time filters

- **Tag Filtering System**
  - View all unique tags in sidebar
  - Click tags to filter pins (supports multiple tag selection)
  - Tag count badges show how many pins use each tag
  - Tags displayed on pin cards (up to 3 visible, with "+X more" indicator)
  - Alphabetically sorted tag list

- **Sorting Options**
  - Newest First (default)
  - Oldest First
  - Title (A-Z)
  - Title (Z-A)
  - Sort dropdown in header for easy access

### 🐛 Bug Fixes

- Fixed pins not displaying on dashboard
- Fixed empty state showing when pins exist
- Fixed large circle/arc visual glitch
- Improved data loading and error handling
- Added comprehensive debugging and logging

### 🔧 Technical Improvements

- Separated product and time filters for independent operation
- Improved data validation and error handling
- Enhanced storage change detection and auto-refresh
- Better handling of edge cases in date calculations
- Optimized rendering performance

### 📝 Developer Experience

- Added extensive console logging for debugging
- Improved code organization and comments
- Better error messages and validation

---

**Full Changelog:**
- Dashboard UI fixes and improvements
- Tag filtering system implementation
- Enhanced time-based filtering
- Sorting functionality
- UI polish and attribution
- Bug fixes and performance improvements
