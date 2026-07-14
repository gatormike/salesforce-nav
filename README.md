# SetupPilot for Salesforce

A Chrome extension that adds a customisable quick-navigation toolbar to Salesforce Setup. Pin your most-used pages, browse recent history, and jump anywhere in Setup in one click.

## ✨ Features

- **Horizontal Navigation Menu**: Clean, dropdown-based navigation that appears at the top of Salesforce Setup pages
- **Fully Configurable**: Customize menu items via in-page modal or options page
- **Quick Access**: Navigate to frequently used Setup pages with just two clicks
- **Star Button**: Quickly add the current Setup page to your menu
- **Persistent Configuration**: Your menu configuration is saved and synced across Chrome instances
- **Modular Architecture**: Clean, maintainable codebase with separation of concerns

## 📦 Installation

### From Source

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the `salesforce-nav` folder
6. The extension is now installed!

### For Development

```bash
# Install dependencies (optional, for linting/formatting)
npm install

# Run validation tests
npm test

# Run unit tests
npm run test:unit

# Check build readiness
npm run build:check

# Lint code
npm run lint

# Format code
npm run format
```

## 🚀 Usage

### Basic Usage

1. Navigate to any Salesforce Setup page (e.g., `https://yourinstance.my.salesforce-setup.com/lightning/setup/`)
2. You'll see a new horizontal menu bar appear with your configured menu items
3. Click any menu header to see dropdown options
4. Click any menu item to navigate to that Setup page

### Adding Current Page to Menu (⭐ Star Button)

1. Navigate to any Salesforce Setup page
2. Click the **star button** (⭐) at the left of the menu bar
3. Choose which menu group to add it to
4. Optionally edit the label
5. Click Save

### Configuring the Menu (⚙️ Settings Button)

1. Click the **gear button** (⚙️) at the right of the menu bar
2. The settings modal will open with full menu management:
   - Add/remove menu groups
   - Add/remove menu items
   - Reorder groups and items using ↑/↓ buttons
   - Edit labels and paths inline
3. Click "Save" to apply your changes
4. Click "Reset" to restore defaults
5. Click "Export" to download your configuration as JSON

### JSON Configuration Format

The configuration is an array of menu groups. Each group has:
- `title`: The text displayed in the top menu bar
- `items`: An array of menu items, each with:
  - `label`: The text displayed in the dropdown
  - `path`: The Salesforce Setup path (relative to `/lightning/setup/`)

Example:
```json
[
  {
    "title": "Users",
    "items": [
      {
        "label": "Users",
        "path": "ManageUsers/home"
      },
      {
        "label": "Profiles",
        "path": "EnhancedProfiles/home"
      }
    ]
  }
]
```

## 📋 Default Menu Items

The extension comes with the following default menu structure:

### Users
- Users, Profiles, Permission Sets, Queues, Territory Models

### Dev
- Apex Classes, Apex Testing, LWC, Custom Metadata Types, App Manager, Flows

### Objects
- Object Manager, Account, Plan, Case

### Jobs
- Apex Jobs, Bulk Data Load, Scheduled Jobs

### Security
- Transaction Security Policies, Event Manager, Event Log File Browser, Sharing Settings, Connected Apps

### Platform
- Company Info, Storage Usage, Sandboxes, Audit Trail, My Domain

## 🏗️ Architecture

The codebase follows a modular architecture:

```
salesforce-nav/
├── manifest.json           # Extension manifest (MV3)
├── config.js              # Default menu configuration
├── content.js             # Main orchestrator (minimal)
├── styles.css             # All styles
├── src/
│   ├── constants.js       # All constants and magic values
│   ├── utils.js          # Utility functions
│   ├── storage.js        # Chrome storage management
│   ├── menu.js           # Menu creation and rendering
│   ├── settings.js       # Settings modal logic
│   └── star.js           # Star button for adding pages
└── tests/
    ├── validate.js        # Validation checks
    ├── unit-tests.js      # Unit tests
    └── build-check.js     # Build readiness check
```

### Key Design Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **No Inline Styles**: All styling in CSS files
3. **Constants Over Magic Values**: All hardcoded values extracted to constants
4. **URL Validation**: Security checks on all user-provided URLs
5. **Error Handling**: Proper try-catch and user feedback
6. **Small Orchestrator**: Main content.js is just coordination logic

## 🔒 Security

- **URL Validation**: All paths are validated against allowed patterns
- **Input Sanitization**: User input is sanitized before display
- **Storage Validation**: Configuration is validated before saving
- **Safe Navigation**: Only allows navigation to Salesforce Setup paths

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests for pure functions
npm run validate         # Validate manifest and config
npm run build:check      # Check build readiness

# Linting and formatting
npm run lint            # Check for linting errors
npm run lint:fix        # Auto-fix linting errors
npm run format          # Format all files
npm run format:check    # Check formatting
```

## 🐛 Troubleshooting

**Menu not appearing:**
- Make sure you're on a Salesforce Lightning Setup page
- Check that the URL matches: `https://*.lightning.force.com/*` or similar
- Try refreshing the page
- Check that the extension is enabled in `chrome://extensions/`

**Configuration not saving:**
- Ensure your JSON is valid (use the settings modal for easier editing)
- Check that each menu group has both `title` and `items`
- Check that each item has both `label` and `path`
- Open browser console to check for errors

**Menu appears in wrong location:**
- The extension tries to intelligently place the menu
- Different Salesforce orgs may have slightly different layouts
- If positioning is off, the menu will still be functional at the top of the page

## 🔧 Development

### Code Quality Standards

- **ESLint**: Enforces code quality rules
- **Prettier**: Ensures consistent formatting
- **Validation**: Automated checks for manifest and config
- **Tests**: Unit tests for utility functions

### Making Changes

1. Make your changes in the appropriate module
2. Run `npm run lint:fix` to fix linting issues
3. Run `npm run format` to format code
4. Run `npm test` to validate changes
5. Test manually in Chrome with "Load unpacked"

### File Load Order (Important!)

The manifest.json specifies the load order for JS files:
1. `src/constants.js` - Must load first (defines constants)
2. `src/utils.js` - Must load second (uses constants)
3. `src/storage.js` - Uses utils
4. `config.js` - Defines DEFAULT_MENU_CONFIG
5. `src/menu.js` - Menu logic
6. `src/settings.js` - Settings logic
7. `src/star.js` - Star button logic
8. `content.js` - Orchestrator (loads last)

## 📊 Code Metrics

- **Total Size**: ~70 KB
- **Main Content Script**: ~150 lines (was 819!)
- **Modules**: 6 separate modules
- **Constants**: 30+ extracted
- **Test Coverage**: Unit tests for all utilities
- **Validation**: 3 test suites

## 📝 Version History

### v2.0.0 (Refactored)
- ✅ Complete modular refactor
- ✅ Fixed critical manifest domain bug
- ✅ Added URL validation and security
- ✅ Extracted all constants
- ✅ Removed code duplication
- ✅ Added comprehensive tests
- ✅ Moved all styles to CSS
- ✅ Added linting and formatting
- ✅ Improved error handling

### v1.0.0 (Original)
- Initial release with configurable menu system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code quality standards
4. Run all tests (`npm test`)
5. Submit a pull request

## 📄 License

MIT — see [LICENSE](LICENSE)

## 🙏 Support

For issues or feature requests, please open an issue in the repository.

## 🔐 Privacy

This extension stores data locally only. No data is ever transmitted. See [privacy-policy.md](privacy-policy.md).
