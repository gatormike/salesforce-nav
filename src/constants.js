/**
 * Constants used throughout the Salesforce Setup Navigator extension
 */

// Salesforce Setup paths
const SF_SETUP_BASE = '/lightning/setup/';
const SF_SETUP_PATTERN = /^\/lightning\/setup\//;

// DOM selectors for finding Salesforce containers
const SALESFORCE_SELECTORS = [
  '[data-aura-class="navexConsoleTabContainer"]',
  '.slds-context-bar__secondary',
  '.navexConsoleTabContainer',
  '.slds-context-bar',
  'header.slds-global-header'
];

const SALESFORCE_TAB_BAR_SELECTOR = 'ul.tabBarItems.slds-grid[role="presentation"]';

// Element IDs
const CUSTOM_NAV_ID = 'sf-custom-nav';
const SETTINGS_MODAL_ID = 'sf-settings-modal';
const SETTINGS_GROUPS_CONTAINER_ID = 'sf-settings-groups-modal';
const SETTINGS_MESSAGE_ID = 'sf-settings-message-modal';
const ADD_PAGE_MODAL_ID = 'sf-add-page-modal';
const ADD_PAGE_MESSAGE_ID = 'sf-add-page-message';

// CSS Classes
const CSS_CLASS_INJECTED_ITEM = 'sf-injected-menu-item';
const CSS_CLASS_NAV_ITEM = 'sf-nav-item';
const CSS_CLASS_NAV_BUTTON = 'sf-nav-button';
const CSS_CLASS_NAV_DROPDOWN = 'sf-nav-dropdown';
const CSS_CLASS_NAV_LINK = 'sf-nav-link';
const CSS_CLASS_OPEN = 'open';

// Timing constants (in milliseconds)
const CONTAINER_SEARCH_TIMEOUT = 3000;
const MESSAGE_DISPLAY_DURATION = 2500;
const STAR_UPDATE_POLL_INTERVAL = 1000; // TODO: Replace with event-based system

// Z-index layers
const Z_INDEX_MENU = 9999;
const Z_INDEX_ADD_MODAL = 100000;
const Z_INDEX_SETTINGS_MODAL = 100001;

// Storage keys
const STORAGE_KEY_MENU_CONFIG = 'menuConfig';
const STORAGE_KEY_HISTORY = 'pageHistory';

// History configuration
const HISTORY_MAX_ITEMS = 100;
  const HISTORY_DISPLAY_LIMIT = 10;
const HISTORY_DROPDOWN_ID = 'sf-history-dropdown';
const HISTORY_LABEL_SETTLE_DELAY = 300;
const HISTORY_LABEL_MAX_WAIT = 5000;

// Selectors used to resolve a meaningful page label, tried in order.
// The first non-empty text found wins.
const HISTORY_LABEL_SELECTORS = [
  'h2.pageDescription',
  '.slds-page-header__title',
  '.uiOutputText[data-aura-class="uiOutputText"]',
  'h1.slds-page-header__title',
  '.setup-header h1'
];

// Star button configuration
const STAR_BUTTON_CONFIG = {
  width: '40px',
  height: '37px',
  iconSize: '16',
  fillColor: '#f6c600',
  strokeColor: '#666',
  strokeWidth: '1'
};

// Settings button configuration
const SETTINGS_BUTTON_CONFIG = {
  width: '40px',
  iconSize: '16',
  iconColor: '#666'
};

// History button configuration
const HISTORY_BUTTON_CONFIG = {
  width: '40px',
  iconSize: '16',
  iconColor: '#666'
};

// Validation patterns
const URL_ALLOWED_PATTERNS = [
  SF_SETUP_PATTERN,
  /^[a-zA-Z0-9_\-\/\?=&%.+]+$/ // Relative paths with alphanumeric, basic chars, and query strings
];
