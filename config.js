const DEFAULT_MENU_CONFIG = [
  {
    "items": [
      {
        "label": "Users",
        "path": "ManageUsers/home"
      },
      {
        "label": "Profiles",
        "path": "EnhancedProfiles/home"
      },
      {
        "label": "Permission Sets",
        "path": "PermSets/home"
      },
      {
        "label": "Territory Models",
        "path": "Territory2Models/page"
      }
    ],
    "title": "Users"
  },
  {
    "items": [
      {
        "label": "Apex Classes",
        "path": "ApexClasses/home"
      },
      {
        "label": "Apex Testing",
        "path": "ApexTestQueue/home"
      },
      {
        "label": "LWC",
        "path": "LightningComponentBundles/home"
      },
      {
        "label": "Custom Metadata Types",
        "path": "CustomMetadata/home"
      },
      {
        "label": "App Manager",
        "path": "NavigationMenus/home"
      },
      {
        "label": "Flows",
        "path": "Flows/home"
      }
    ],
    "title": "Code"
  },
  {
    "items": [
      {
        "label": "Account",
        "path": "ObjectManager/Account/FieldsAndRelationships/view"
      },
      {
        "label": "Plan",
        "path": "ObjectManager/01I0h000000fETd/FieldsAndRelationships/view"
      },
      {
        "label": "Case",
        "path": "ObjectManager/Case/FieldsAndRelationships/view"
      }
    ],
    "title": "Objects"
  },
  {
    "items": [
      {
        "label": "Scheduled",
        "path": "ScheduledJobs/home"
      },
      {
        "label": "Bulk Data Load",
        "path": "AsyncApiJobStatus/home"
      }
    ],
    "title": "Jobs"
  },
  {
    "items": [
      {
        "label": "Transaction Security Policies",
        "path": "TransactionSecurityNew/home"
      },
      {
        "label": "Event Manager",
        "path": "EventManager/home"
      },
      {
        "label": "Event Log File Browser",
        "path": "ElfBrowser/home"
      },
      {
        "label": "Sharing Settings",
        "path": "SecuritySharing/home"
      },
      {
        "label": "Connected Apps OAuth Usage",
        "path": "ConnectedAppsUsage/home"
      },
      {
        "label": "Manage Connected Apps",
        "path": "ConnectedApplication/home"
      }
    ],
    "title": "Security"
  },
  {
    "items": [
      {
        "label": "Company Info",
        "path": "CompanyProfileInfo/home"
      },
      {
        "label": "Storage Usage",
        "path": "CompanyResourceDisk/home"
      },
      {
        "label": "Sandboxes",
        "path": "DataManagementCreateTestInstance/home"
      },
      {
        "label": "View Setup Audit Trail",
        "path": "SecurityEvents/home"
      }
    ],
    "title": "Platform"
  }
]

// Expose for pages that expect window.DEFAULT_MENU_CONFIG
if (typeof window !== 'undefined') window.DEFAULT_MENU_CONFIG = DEFAULT_MENU_CONFIG;