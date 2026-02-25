# Microsoft Teams Integration Upgrade Guide

Add Teams OAuth login + side-panel support.

## Files to edit
- `src/services/auth.js` — add MSAL auth flow
- `src/components/login.js` — add "Sign in with Teams" button

## Step 1: Register an App in Azure Entra ID
1. Go to portal.azure.com → Entra ID → App registrations → New
2. Name: "No7 Analytics"
3. Redirect URI: `https://yourusername.github.io/no7-analytics/`
4. Note your **Application (client) ID** and **Tenant ID**
5. Under API permissions, add: `User.Read`, `offline_access`

## Step 2: Add MSAL.js

```html
<!-- In index.html -->
<script src="https://alcdn.msauth.net/browser/2.39.0/js/msal-browser.min.js"></script>
```

## Step 3: Auth code in auth.js

```js
// UPGRADE HOOK: Teams / Entra ID Auth
// Add to auth.js:

const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: window.location.origin + '/no7-analytics/',
  }
}

const msalInstance = new msal.PublicClientApplication(msalConfig)

export async function signInWithTeams() {
  const request = { scopes: ['User.Read'] }
  
  try {
    const response = await msalInstance.loginPopup(request)
    const account  = response.account
    
    // Map Teams user to app role
    // You can check group membership or custom attributes
    const role = account.username.includes('admin') ? 'master' : 'staff'
    
    return {
      ok:   true,
      role,
      user: account.name || account.username,
      teamsToken: response.accessToken,
    }
  } catch (e) {
    return { ok: false, message: e.message }
  }
}
```

## Step 4: Teams Tab Manifest
To make the app a Teams Tab (side panel):

```json
// manifest.json for Teams app
{
  "manifestVersion": "1.16",
  "id": "your-app-guid",
  "name": { "short": "No7 Analytics" },
  "staticTabs": [
    {
      "entityId": "no7-analytics",
      "name": "Sales Analytics",
      "contentUrl": "https://yourusername.github.io/no7-analytics/",
      "scopes": ["personal", "team"]
    }
  ]
}
```

Upload the manifest zip to Teams Admin → Manage apps.
