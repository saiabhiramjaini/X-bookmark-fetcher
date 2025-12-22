#!/usr/bin/env node

/**
 * Enhanced fetch script with automatic GitHub Secrets update
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let X_OAUTH2_ACCESS_TOKEN = process.env.X_OAUTH2_ACCESS_TOKEN;
const X_OAUTH2_REFRESH_TOKEN = process.env.X_OAUTH2_REFRESH_TOKEN;
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_USERNAME = process.env.X_USERNAME || 'Abhiram2k03';
const MAX_BOOKMARKS = parseInt(process.env.MAX_BOOKMARKS || '10');
const DEBUG = process.env.DEBUG === 'true';

// GitHub token for updating secrets (only available in GitHub Actions)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // format: owner/repo

let tokensWereRefreshed = false;
let newAccessToken = null;
let newRefreshToken = null;

/**
 * Update GitHub repository secret using GitHub API
 */
async function updateGitHubSecret(secretName, secretValue) {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.log('⚠️  Not running in GitHub Actions, skipping secret update');
    return false;
  }

  try {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    
    // Step 1: Get the repository's public key
    const keyResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    if (!keyResponse.ok) {
      throw new Error(`Failed to get public key: ${keyResponse.status}`);
    }
    
    const { key, key_id } = await keyResponse.json();
    
    // Step 2: Encrypt the secret value using libsodium
    // Note: In Node.js, we need to use the tweetnacl library for encryption
    const sodium = await import('tweetnacl');
    const sealedBox = await import('tweetnacl-sealedbox-js');
    
    const messageBytes = Buffer.from(secretValue);
    const keyBytes = Buffer.from(key, 'base64');
    const encryptedBytes = sealedBox.seal(messageBytes, keyBytes);
    const encrypted_value = Buffer.from(encryptedBytes).toString('base64');
    
    // Step 3: Update the secret
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          encrypted_value,
          key_id
        })
      }
    );
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update secret: ${updateResponse.status}`);
    }
    
    console.log(`✅ Successfully updated GitHub Secret: ${secretName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update GitHub Secret ${secretName}:`, error.message);
    return false;
  }
}

/**
 * Refresh the OAuth 2.0 access token using the refresh token
 */
async function refreshAccessToken() {
  console.log('🔄 Refreshing access token...');
  
  const params = new URLSearchParams({
    refresh_token: X_OAUTH2_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to refresh token: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    X_OAUTH2_ACCESS_TOKEN = data.access_token;
    
    // Store tokens for later GitHub Secrets update
    tokensWereRefreshed = true;
    newAccessToken = data.access_token;
    if (data.refresh_token) {
      newRefreshToken = data.refresh_token;
    }
    
    console.log('✅ Access token refreshed successfully');
    console.log('ℹ️  New token expires in:', data.expires_in, 'seconds');
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Failed to refresh access token:', error.message);
    throw error;
  }
}

/**
 * Make an API request with automatic token refresh on 401 errors
 */
async function fetchWithTokenRefresh(url, options = {}) {
  const makeRequest = async (token) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let response = await makeRequest(X_OAUTH2_ACCESS_TOKEN);

  if (response.status === 401) {
    console.log('⚠️  Access token expired, refreshing...');
    await refreshAccessToken();
    response = await makeRequest(X_OAUTH2_ACCESS_TOKEN);
  }

  return response;
}

async function getUserIdFromUsername(username) {
  const url = `https://api.x.com/2/users/by/username/${username}?user.fields=id`;
  
  if (DEBUG) {
    console.log('\n🔍 Fetching user ID...');
    console.log('  URL:', url);
  }
  
  const response = await fetchWithTokenRefresh(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to get user ID: ${response.status} ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  if (DEBUG) {
    console.log('  User ID:', data.data.id);
  }
  return data.data.id;
}

async function fetchXBookmarks(userId, maxResults = 10) {
  const url = new URL(`https://api.x.com/2/users/${userId}/bookmarks`);
  url.searchParams.append('max_results', maxResults.toString());
  url.searchParams.append('tweet.fields', 'created_at,author_id,public_metrics,text,attachments');
  url.searchParams.append('user.fields', 'username,name');
  url.searchParams.append('expansions', 'author_id,attachments.media_keys');
  url.searchParams.append('media.fields', 'url,preview_image_url,type');
  
  const response = await fetchWithTokenRefresh(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to fetch bookmarks: ${response.status} ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  // Map author information
  if (data.includes?.users) {
    const userMap = new Map(data.includes.users.map((user) => [user.id, user]));
    data.data = data.data.map((tweet) => ({
      ...tweet,
      author_username: userMap.get(tweet.author_id)?.username,
      author_name: userMap.get(tweet.author_id)?.name,
      url: `https://x.com/${userMap.get(tweet.author_id)?.username}/status/${tweet.id}`,
    }));
  }
  
  return data;
}

function bookmarkToMarkdown(bookmark) {
  const date = new Date(bookmark.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  const author = bookmark.author_name || bookmark.author_username || 'Unknown';
  const username = bookmark.author_username || 'unknown';
  
  let text = bookmark.text.trim();
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, '[$1]($1)');
  
  const title = text.split('\n')[0].substring(0, 100);
  
  return `## ${title}

**Originally posted by [@${username}](https://x.com/${username})** on ${formattedDate}

[View original tweet](${bookmark.url})

---

${text}
`;
}

async function main() {
  try {
    console.log('🚀 Fetching X bookmarks...');
    console.log(`📝 Username: ${X_USERNAME}`);
    console.log(`📊 Max bookmarks: ${MAX_BOOKMARKS}`);
    
    const userId = await getUserIdFromUsername(X_USERNAME);
    console.log(`✅ Found user ID: ${userId}`);
    
    const bookmarksData = await fetchXBookmarks(userId, MAX_BOOKMARKS);
    
    if (!bookmarksData.data || bookmarksData.data.length === 0) {
      console.log('ℹ️  No bookmarks found');
      return;
    }
    
    console.log(`✅ Fetched ${bookmarksData.data.length} bookmarks`);
    
    // Process bookmarks (your existing code)...
    const postsDir = join(__dirname, '..', 'src', 'pages', 'posts');
    if (!existsSync(postsDir)) {
      mkdirSync(postsDir, { recursive: true });
    }
    
    const existingPosts = new Set();
    const postsDataPath = join(__dirname, '..', 'src', 'data', 'posts.ts');
    
    if (existsSync(postsDataPath)) {
      const postsContent = readFileSync(postsDataPath, 'utf-8');
      const idMatches = postsContent.matchAll(/id: ['"]([^'"]+)['"]/g);
      for (const match of idMatches) {
        existingPosts.add(match[1]);
      }
    }
    
    const newPosts = [];
    console.log('\n📝 Processing bookmarks...');
    
    for (const bookmark of bookmarksData.data) {
      const slug = `x-bookmark-${bookmark.id}`;
      
      if (existingPosts.has(slug)) {
        console.log(`⏭️  Skipping existing post: ${slug}`);
        continue;
      }
      
      const markdown = bookmarkToMarkdown(bookmark);
      const mdPath = join(postsDir, `${slug}.md`);
      
      writeFileSync(mdPath, markdown, 'utf-8');
      console.log(`✅ Created: ${mdPath}`);
      
      const firstLine = bookmark.text.split('\n')[0].substring(0, 100);
      const excerpt = bookmark.text.substring(0, 200).trim() + (bookmark.text.length > 200 ? '...' : '');
      const date = new Date(bookmark.created_at);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      newPosts.push({
        id: slug,
        title: firstLine,
        date: monthYear,
        author: bookmark.author_name || bookmark.author_username || 'Unknown',
        categories: ['X Bookmark', 'Curated'],
        excerpt: excerpt,
      });
    }
    
    if (newPosts.length > 0) {
      console.log(`\n📝 Updating posts.ts with ${newPosts.length} new posts...`);
      // Update posts.ts logic...
    }
    
    // If tokens were refreshed, update GitHub Secrets
    if (tokensWereRefreshed) {
      console.log('\n🔐 Updating GitHub Secrets with new tokens...');
      
      if (newAccessToken) {
        await updateGitHubSecret('X_OAUTH2_ACCESS_TOKEN', newAccessToken);
      }
      
      if (newRefreshToken) {
        await updateGitHubSecret('X_OAUTH2_REFRESH_TOKEN', newRefreshToken);
      }
    }
    
    console.log(`\n🎉 Successfully created ${newPosts.length} new blog posts from X bookmarks!`);
  } catch (error) {
    console.error('\n❌ ERROR OCCURRED');
    console.error('Error Message:', error.message);
    process.exit(1);
  }
}

main();
