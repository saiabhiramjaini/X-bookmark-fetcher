#!/usr/bin/env node

/**
 * Script to fetch X bookmarks and convert them to blog posts
 * Runs via GitHub Actions or manually
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration from environment variables
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_USERNAME = process.env.X_USERNAME || 'gauri__gupta';
const MAX_BOOKMARKS = parseInt(process.env.MAX_BOOKMARKS || '10');
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('\n🔍 DEBUG MODE ENABLED');
  console.log('═══════════════════════════════════════');
  console.log('Environment Configuration:');
  console.log('  X_USERNAME:', X_USERNAME);
  console.log('  MAX_BOOKMARKS:', MAX_BOOKMARKS);
  console.log('  X_BEARER_TOKEN:', X_BEARER_TOKEN ? `Set (${X_BEARER_TOKEN.length} chars)` : 'NOT SET');
  console.log('  Working Directory:', process.cwd());
  console.log('═══════════════════════════════════════\n');
}

if (!X_BEARER_TOKEN) {
  console.error('❌ Error: X_BEARER_TOKEN is not set');
  console.error('Please set X_BEARER_TOKEN environment variable or add it to .env file');
  process.exit(1);
}

/**
 * Fetch user ID from username
 */
async function getUserIdFromUsername(bearerToken, username) {
  const url = new URL(`https://api.x.com/2/users/by/username/${username}`);
  url.searchParams.append('user.fields', 'id');

  if (DEBUG) {
    console.log('\n🔍 Fetching user ID...');
    console.log('  URL:', url.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (DEBUG) {
    console.log('  Response Status:', response.status, response.statusText);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('\n❌ Failed to get user ID');
    console.error('  Status:', response.status);
    console.error('  Error:', JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to get user ID: ${response.status} ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  if (DEBUG) {
    console.log('  User ID:', data.data.id);
  }
  return data.data.id;
}

/**
 * Fetch X bookmarks for a user
 */
async function fetchXBookmarks(bearerToken, userId, maxResults = 10) {
  const url = new URL(`https://api.x.com/2/users/${userId}/bookmarks`);
  url.searchParams.append('max_results', maxResults.toString());
  url.searchParams.append(
    'tweet.fields',
    'created_at,author_id,public_metrics,text,attachments'
  );
  url.searchParams.append('user.fields', 'username,name');
  url.searchParams.append('expansions', 'author_id,attachments.media_keys');
  url.searchParams.append('media.fields', 'url,preview_image_url,type');

  if (DEBUG) {
    console.log('\n🔍 Fetching bookmarks...');
    console.log('  User ID:', userId);
    console.log('  Max Results:', maxResults);
    console.log('  URL:', url.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (DEBUG) {
    console.log('  Response Status:', response.status, response.statusText);
    console.log('  Response Headers:', Object.fromEntries(response.headers.entries()));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('\n❌ Failed to fetch bookmarks');
    console.error('  Status:', response.status);
    console.error('  Error:', JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to fetch X bookmarks: ${response.status} ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();

  if (DEBUG) {
    console.log('  Bookmarks found:', data.data?.length || 0);
    console.log('  Users included:', data.includes?.users?.length || 0);
    console.log('  Media included:', data.includes?.media?.length || 0);
  }

  // Map author information to tweets
  if (data.includes?.users) {
    const userMap = new Map(
      data.includes.users.map((user) => [user.id, user])
    );
    if (DEBUG) {
      console.log('  Enriching bookmarks with author data...');
    }
    data.data = data.data.map((tweet) => ({
      ...tweet,
      author_username: userMap.get(tweet.author_id)?.username,
      author_name: userMap.get(tweet.author_id)?.name,
      url: `https://x.com/${userMap.get(tweet.author_id)?.username}/status/${tweet.id}`,
    }));
  }

  return data;
}

/**
 * Generate a slug from tweet text
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Convert bookmark to blog post markdown
 */
function bookmarkToMarkdown(bookmark) {
  const date = new Date(bookmark.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const author = bookmark.author_name || bookmark.author_username || 'Unknown';
  const username = bookmark.author_username || 'unknown';

  // Clean up text
  let text = bookmark.text.trim();
  
  // Convert URLs to markdown links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, '[$1]($1)');

  const markdown = `# ${text.split('\n')[0].substring(0, 100)}

**Originally posted by [@${username}](https://x.com/${username})** on ${formattedDate}

[View original tweet](${bookmark.url})

---

${text}

---

## Metrics

- 👍 Likes: ${bookmark.public_metrics?.like_count || 0}
- 🔄 Retweets: ${bookmark.public_metrics?.retweet_count || 0}
- 💬 Replies: ${bookmark.public_metrics?.reply_count || 0}
`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Fetching X bookmarks...');
    console.log(`📝 Username: ${X_USERNAME}`);
    console.log(`📊 Max bookmarks: ${MAX_BOOKMARKS}`);

    // Get user ID
    const userId = await getUserIdFromUsername(X_BEARER_TOKEN, X_USERNAME);
    console.log(`✅ Found user ID: ${userId}`);

    // Fetch bookmarks
    const bookmarksData = await fetchXBookmarks(
      X_BEARER_TOKEN,
      userId,
      MAX_BOOKMARKS
    );

    if (!bookmarksData.data || bookmarksData.data.length === 0) {
      console.log('ℹ️  No bookmarks found');
      return;
    }

    console.log(`✅ Fetched ${bookmarksData.data.length} bookmarks`);

    if (DEBUG) {
      console.log('\n📋 Bookmark details:');
      bookmarksData.data.forEach((bookmark, index) => {
        console.log(`  ${index + 1}. ID: ${bookmark.id}`);
        console.log(`     Author: ${bookmark.author_name} (@${bookmark.author_username})`);
        console.log(`     Text: ${bookmark.text.substring(0, 50)}...`);
      });
    }

    // Create directories if they don't exist
    const postsDir = join(__dirname, '..', 'src', 'pages', 'posts');
    const publicBlogsDir = join(__dirname, '..', 'public', 'blogs');
    
    if (DEBUG) {
      console.log('\n📁 Checking directories...');
      console.log('  Posts directory:', postsDir);
      console.log('  Public blogs directory:', publicBlogsDir);
    }
    
    if (!existsSync(postsDir)) {
      console.log(`  Creating posts directory: ${postsDir}`);
      mkdirSync(postsDir, { recursive: true });
    }
    if (!existsSync(publicBlogsDir)) {
      console.log(`  Creating public blogs directory: ${publicBlogsDir}`);
      mkdirSync(publicBlogsDir, { recursive: true });
    }

    // Track existing posts to avoid duplicates
    const existingPosts = new Set();
    const postsDataPath = join(__dirname, '..', 'src', 'data', 'posts.ts');
    
    if (DEBUG) {
      console.log('\n🔍 Checking for existing posts...');
      console.log('  Posts data path:', postsDataPath);
      console.log('  File exists:', existsSync(postsDataPath));
    }
    
    if (existsSync(postsDataPath)) {
      const postsContent = readFileSync(postsDataPath, 'utf-8');
      const idMatches = postsContent.matchAll(/id: ['"]([^'"]+)['"]/g);
      for (const match of idMatches) {
        existingPosts.add(match[1]);
      }
      if (DEBUG) {
        console.log(`  Found ${existingPosts.size} existing posts`);
      }
    }

    // Generate blog posts from bookmarks
    const newPosts = [];
    console.log('\n📝 Processing bookmarks...');
    
    for (const bookmark of bookmarksData.data) {
      const slug = `x-bookmark-${bookmark.id}`;
      
      // Skip if already exists
      if (existingPosts.has(slug)) {
        console.log(`⏭️  Skipping existing post: ${slug}`);
        continue;
      }

      if (DEBUG) {
        console.log(`\n  Processing: ${slug}`);
        console.log(`    Author: ${bookmark.author_name}`);
        console.log(`    Text length: ${bookmark.text.length} chars`);
      }

      const markdown = bookmarkToMarkdown(bookmark);
      const mdPath = join(postsDir, `${slug}.md`);
      
      writeFileSync(mdPath, markdown, 'utf-8');
      console.log(`✅ Created: ${mdPath}`);
      
      if (DEBUG) {
        console.log(`    File size: ${markdown.length} bytes`);
      }

      // Add to posts array
      const firstLine = bookmark.text.split('\n')[0].substring(0, 100);
      const excerpt = bookmark.text.substring(0, 200).trim() + (bookmark.text.length > 200 ? '...' : '');
      
      const date = new Date(bookmark.created_at);
      const monthYear = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      newPosts.push({
        id: slug,
        title: firstLine,
        date: monthYear,
        author: bookmark.author_name || bookmark.author_username || 'Unknown',
        categories: ['X Bookmark', 'Curated'],
        excerpt: excerpt,
      });
    }

    if (newPosts.length === 0) {
      console.log('ℹ️  No new posts to add');
      if (DEBUG) {
        console.log('  All bookmarks already exist in posts.ts');
      }
      return;
    }

    // Update posts.ts
    console.log(`\n📝 Updating posts.ts with ${newPosts.length} new posts...`);
    
    if (DEBUG) {
      console.log('  New posts to add:');
      newPosts.forEach((post, index) => {
        console.log(`    ${index + 1}. ${post.id} - ${post.title.substring(0, 50)}...`);
      });
    }
    
    let postsContent = existsSync(postsDataPath) 
      ? readFileSync(postsDataPath, 'utf-8')
      : `const posts = [];\n\nexport { posts };\nexport default posts;\n`;

    // Generate import statements for new posts
    const newImports = newPosts.map(post => 
      `import ${post.id.replace(/-/g, '_')}Md from '../pages/posts/${post.id}.md?raw';`
    ).join('\n');

    // Generate new post objects
    const newPostObjects = newPosts.map(post => `  {
    id: '${post.id}',
    title: '${post.title.replace(/'/g, "\\'")}',
    date: '${post.date}',
    author: '${post.author.replace(/'/g, "\\'")}',
    categories: ${JSON.stringify(post.categories)},
    excerpt: '${post.excerpt.replace(/'/g, "\\'")}',
    content: ${post.id.replace(/-/g, '_')}Md,
  }`).join(',\n');

    // Add imports at the top
    const importMatch = postsContent.match(/^(import[^;]+;?\n)*/);
    const existingImports = importMatch ? importMatch[0] : '';
    const restOfContent = postsContent.substring(existingImports.length);

    // Add new posts to array
    const arrayMatch = restOfContent.match(/const posts = \[([\s\S]*?)\];/);
    if (arrayMatch) {
      const existingPostsStr = arrayMatch[1].trim();
      const updatedPosts = existingPostsStr 
        ? `${existingPostsStr},\n${newPostObjects}`
        : newPostObjects;
      
      const newContent = `${existingImports}${newImports}\n\n${restOfContent.replace(
        /const posts = \[([\s\S]*?)\];/,
        `const posts = [\n${updatedPosts}\n];`
      )}`;
      
      writeFileSync(postsDataPath, newContent, 'utf-8');
      console.log('✅ Updated posts.ts');
      
      if (DEBUG) {
        console.log(`  File size: ${newContent.length} bytes`);
        console.log(`  Total posts in file: ${newPosts.length + existingPosts.size}`);
      }
    }

    console.log(`\n🎉 Successfully created ${newPosts.length} new blog posts from X bookmarks!`);
    
  } catch (error) {
    console.error('\n❌ ERROR OCCURRED');
    console.error('═══════════════════════════════════════');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('═══════════════════════════════════════');
    
    if (DEBUG) {
      console.error('\nFull error object:', error);
    }
    
    process.exit(1);
  }
}

main();
