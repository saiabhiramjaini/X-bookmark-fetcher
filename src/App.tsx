import { useState, useEffect } from 'react'

interface Post {
  id: string
  title: string
  date: string
  author: string
  categories: string[]
  excerpt: string
  content?: string
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
 
  useEffect(() => {
    // Try to load posts from the data file
    const loadPosts = async () => {
      try {
        // This will be populated by GitHub Actions
        const postsModule = await import('./data/posts.ts').catch(() => null)
        if (postsModule && postsModule.posts) {
          setPosts(postsModule.posts)
        }
        setLoading(false)
      } catch (err) {
        console.log('No posts found yet - waiting for GitHub Actions to fetch bookmarks')
        setLoading(false)
        console.error(err)
      }
    }
    loadPosts()
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📚 X Bookmarks Collection</h1>
      
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        borderLeft: '4px solid #1DA1F2'
      }}>
        <h3 style={{ marginTop: 0, color: '#1976d2' }}>🤖 Automated Bookmark Fetching</h3>
        <p>This site displays X (Twitter) bookmarks automatically fetched via GitHub Actions.</p>
        <ul style={{ marginBottom: 0 }}>
          <li>✅ Runs on every push to main branch</li>
          <li>✅ Runs daily at 9:00 AM UTC</li>
          <li>✅ Uses OAuth 1.0a authentication</li>
          <li>✅ Converts bookmarks to blog posts</li>
        </ul>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffc107'
        }}>
          <h2 style={{ color: '#856404' }}>📭 No Posts Yet</h2>
          <p style={{ color: '#856404' }}>
            Bookmarks will appear here once the GitHub Actions workflow runs successfully.
          </p>
          <div style={{ marginTop: '1.5rem', textAlign: 'left', maxWidth: '600px', margin: '1.5rem auto 0' }}>
            <p><strong>Next steps:</strong></p>
            <ol style={{ color: '#856404' }}>
              <li>Make sure you've added all OAuth secrets to GitHub</li>
              <li>Push any change to trigger the workflow</li>
              <li>Check the Actions tab in your GitHub repo for progress</li>
              <li>Posts will appear here automatically after successful fetch</li>
            </ol>
          </div>
        </div>
      ) : (
        <div>
          <h2>Found {posts.length} Bookmarked Posts</h2>
          <div style={{ display: 'grid', gap: '1.5rem', marginTop: '2rem' }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <h3 style={{ marginTop: 0, color: '#1DA1F2' }}>{post.title}</h3>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#666'
                }}>
                  <span>👤 {post.author}</span>
                  <span>📅 {post.date}</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  {post.categories.map((cat) => (
                    <span
                      key={cat}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        marginRight: '0.5rem',
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <p style={{ color: '#555', lineHeight: '1.6' }}>{post.excerpt}</p>

                <a
                  href={`https://x.com/search?q=${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#1DA1F2',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  View on X →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: '3rem', 
        padding: '1rem', 
        textAlign: 'center',
        color: '#999',
        fontSize: '0.9rem',
        borderTop: '1px solid #eee'
      }}>
        <p>
          Powered by GitHub Actions • Updates automatically • 
          <a 
            href="https://github.com/saiabhiramjaini/X-bookmark-fetcher" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#1DA1F2', marginLeft: '0.5rem' }}
          >
            View Source
          </a>
        </p>
      </div>
    </div>
  )
}

export default App
