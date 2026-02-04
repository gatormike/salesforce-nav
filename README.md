# Salesforce Setup Navigator Chrome Extension

A Chrome extension that adds a configurable horizontal navigation menu to Salesforce Setup pages for quick access to commonly used setup pages.

## Features

- **Horizontal Navigation Menu**: Clean, dropdown-based navigation that appears at the top of Salesforce Setup pages
- **Fully Configurable**: Customize menu items via JSON configuration
- **Quick Access**: Navigate to frequently used Setup pages with just two clicks
- **Persistent Configuration**: Your menu configuration is saved and synced across Chrome instances

## Installation

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the `salesforce-nav` folder
6. The extension is now installed!

## Usage

### Basic Usage

1. Navigate to any Salesforce Setup page (e.g., `https://yourinstance.lightning.force.com/lightning/setup/SetupOneHome/home`)
2. You'll see a new horizontal menu bar appear with your configured menu items
3. Click any menu header to see dropdown options
4. Click any menu item to navigate to that Setup page

### Configuring the Menu

1. Click the extension icon in your Chrome toolbar
2. The configuration popup will appear with the current menu configuration in JSON format
3. Edit the JSON to add, remove, or modify menu items
4. Click "Save Configuration" to apply your changes
5. Click "Reset to Default" to restore the original configuration

### JSON Configuration Format

The configuration is an array of menu groups. Each group has:
- `title`: The text displayed in the top menu bar
- `items`: An array of menu items, each with:
  - `label`: The text displayed in the dropdown
  - `path`: The Salesforce Setup path (e.g., `/lightning/setup/ManageUsers/home`)

Example:
```json
[
  {
    "title": "Users",
    "items": [
      {
        "label": "Users",
        "path": "/lightning/setup/ManageUsers/home"
      },
      {
        "label": "Profiles",
        "path": "/lightning/setup/EnhancedProfiles/home"
      }
    ]
  },
  {
    "title": "Code",
    "items": [
      {
        "label": "Apex Classes",
        "path": "/lightning/setup/ApexClasses/home"
      }
    ]
  }
]
```

## Default Menu Items

The extension comes with the following default menu structure:

### Users
- Users
- Profiles
- Permission Sets

### Code
- Apex Classes
- Apex Testing
- LWC

### Jobs
- Scheduled
- Bulk Data Load

### Platform
- Company Info
- Storage

## Finding Salesforce Setup Paths

To find the path for any Setup page:
1. Navigate to the Setup page in Salesforce
2. Look at the URL after your instance domain
3. Copy the path starting with `/lightning/setup/...`
4. Add it to your configuration

## Troubleshooting

**Menu not appearing:**
- Make sure you're on a Salesforce Lightning Setup page
- Try refreshing the page
- Check that the extension is enabled in `chrome://extensions/`

**Configuration not saving:**
- Ensure your JSON is valid (use a JSON validator if needed)
- Check that each menu group has both `title` and `items`
- Check that each item has both `label` and `path`

**Menu appears in wrong location:**
- The extension tries to place the menu intelligently based on Salesforce's DOM structure
- Different Salesforce orgs may have slightly different layouts
- If positioning is off, the menu will still be functional at the top of the page

## Technical Notes

- The extension injects a horizontal menu bar into Salesforce Setup pages
- It positions itself to append after the existing Setup navigation
- Configuration is stored in Chrome's sync storage
- The menu automatically updates when you change the configuration

## Support

For issues or feature requests, please contact the development team or file an issue in the repository.

## Version History

- **v1.0**: Initial release with configurable menu system
