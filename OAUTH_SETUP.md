# X (Twitter) OAuth 1.0a Setup Guide

The X API Bookmarks endpoint requires **OAuth 1.0a User Context** authentication. Here's how to set it up:

## Step 1: Create a X Developer Account

1. Go to [developer.x.com](https://developer.x.com)
2. Sign in with your X account
3. Apply for a developer account if you haven't already

## Step 2: Create a New App

1. Go to the [Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Click on "Projects & Apps" in the sidebar
3. Click "+ Create App" or use an existing app
4. Give your app a name (e.g., "Bookmark Fetcher")

## Step 3: Get Your OAuth 1.0a Credentials

1. In your app settings, go to the "Keys and Tokens" tab
2. You'll find:
   - **API Key** (Consumer Key) - `X_API_KEY`
   - **API Key Secret** (Consumer Secret) - `X_API_SECRET`
3. Under "Authentication Tokens", click "Generate" to create:
   - **Access Token** - `X_ACCESS_TOKEN`
   - **Access Token Secret** - `X_ACCESS_TOKEN_SECRET`

⚠️ **Important**: Make sure your app has **Read permissions** at minimum. You can check/change this in the "User authentication settings" section.

## Step 4: Set Up App Permissions

1. In your app settings, go to "User authentication settings"
2. Click "Set up" if you haven't configured it yet
3. Enable "OAuth 1.0a"
4. Set "App permissions" to at least **Read**
5. Fill in the required URLs (you can use placeholders for testing):
   - Callback URL: `http://localhost:3000/callback`
   - Website URL: `http://localhost:3000`
6. Save your settings

## Step 5: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret" and add each of these:

   | Secret Name | Value |
   |------------|-------|
   | `X_API_KEY` | Your API Key (Consumer Key) |
   | `X_API_SECRET` | Your API Key Secret (Consumer Secret) |
   | `X_ACCESS_TOKEN` | Your Access Token |
   | `X_ACCESS_TOKEN_SECRET` | Your Access Token Secret |
   | `X_USERNAME` | Your X username (without @) |
   | `MAX_BOOKMARKS` | Number of bookmarks to fetch (optional, default: 5) |

## Step 6: Test Locally (Optional)

Create a `.env` file in your project root:

```env
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here
X_USERNAME=your_username
MAX_BOOKMARKS=10
DEBUG=true
```

Then run:
```bash
npm run fetch-x-bookmarks
```

## Troubleshooting

### Error: "Unsupported Authentication"
- Make sure you're using OAuth 1.0a credentials, not a Bearer Token
- Verify your app has the correct permissions (Read access minimum)
- Regenerate your access tokens if needed

### Error: "Could not authenticate you"
- Double-check all four credentials are correct
- Ensure there are no extra spaces in your secrets
- Verify your access tokens haven't been revoked

### Error: "Rate limit exceeded"
- The X API has rate limits. Wait 15 minutes and try again
- Reduce `MAX_BOOKMARKS` to fetch fewer bookmarks

## Why OAuth 1.0a and Not Bearer Token?

The X Bookmarks API endpoint specifically requires **user context** authentication because it accesses user-specific data (your bookmarks). Bearer tokens only provide **app-level** authentication, which is why you get a 403 error when using them.

OAuth 1.0a ensures that:
- The request is made on behalf of a specific user
- The user has authorized the app to access their bookmarks
- The authentication is secure and properly scoped

## Resources

- [X API Documentation](https://developer.x.com/en/docs/twitter-api)
- [OAuth 1.0a Documentation](https://developer.x.com/en/docs/authentication/oauth-1-0a)
- [Bookmarks Endpoint Docs](https://developer.x.com/en/docs/twitter-api/bookmarks/introduction)
