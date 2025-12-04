import { useState } from 'react'

interface Bookmark {
  id: string
  text: string
  created_at: string
  author_username?: string
  author_name?: string
  url?: string
  author_id?: string
  public_metrics?: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
}

interface XUser {
  id: string
  username: string
  name: string
}

function App() {
  const [bearerToken, setBearerToken] = useState('')
  const [username, setUsername] = useState('Abhiram2k03')
  const [maxBookmarks, setMaxBookmarks] = useState(10)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBookmarks = async () => {
    setError('⚠️ Browser-based fetching is not supported for X bookmarks. The X API requires OAuth 1.0a User Context authentication which cannot be implemented securely in a browser. Please use the GitHub Actions workflow or run the script locally with proper OAuth credentials.')
    return

    // Note: The code below will not work because X bookmarks endpoint requires OAuth 1.0a
    // which cannot be implemented in a browser due to security constraints (consumer secret exposure)
    
    if (!bearerToken) {
      setError('Please enter your X Bearer Token')
      return
    }

    setLoading(true)
    setError('')
    setBookmarks([])

    try {
      // Step 1: Get user ID from username
      const userResponse = await fetch(
        `https://api.x.com/2/users/by/username/${username}?user.fields=id`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}))
        throw new Error(`Failed to get user ID: ${userResponse.status} ${JSON.stringify(errorData)}`)
      }

      const userData = await userResponse.json()
      const userId = userData.data.id

      // Step 2: Fetch bookmarks
      const bookmarksUrl = new URL(`https://api.x.com/2/users/${userId}/bookmarks`)
      bookmarksUrl.searchParams.append('max_results', maxBookmarks.toString())
      bookmarksUrl.searchParams.append('tweet.fields', 'created_at,author_id,public_metrics,text,attachments')
      bookmarksUrl.searchParams.append('user.fields', 'username,name')
      bookmarksUrl.searchParams.append('expansions', 'author_id,attachments.media_keys')
      bookmarksUrl.searchParams.append('media.fields', 'url,preview_image_url,type')

      const bookmarksResponse = await fetch(bookmarksUrl.toString(), {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!bookmarksResponse.ok) {
        const errorData = await bookmarksResponse.json().catch(() => ({}))
        throw new Error(`Failed to fetch bookmarks: ${bookmarksResponse.status} ${JSON.stringify(errorData)}`)
      }

      const bookmarksData = await bookmarksResponse.json()

      // Map author information to tweets
      if (bookmarksData.includes?.users) {
        const userMap = new Map<string, XUser>(
          bookmarksData.includes.users.map((user: XUser) => [user.id, user])
        )
        const enrichedBookmarks = bookmarksData.data.map((tweet: Bookmark) => ({
          ...tweet,
          author_username: userMap.get(tweet.author_id || '')?.username,
          author_name: userMap.get(tweet.author_id || '')?.name,
          url: `https://x.com/${userMap.get(tweet.author_id || '')?.username}/status/${tweet.id}`,
        }))
        setBookmarks(enrichedBookmarks)
      } else {
        setBookmarks(bookmarksData.data || [])
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching bookmarks')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>X Bookmarks Fetcher</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            X Bearer Token:
          </label>
          <input
            type="password"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            placeholder="Enter your X API Bearer Token"
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            X Username:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (without @)"
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Max Bookmarks:
          </label>
          <input
            type="number"
            value={maxBookmarks}
            onChange={(e) => setMaxBookmarks(parseInt(e.target.value))}
            min="1"
            max="100"
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button
          onClick={fetchBookmarks}
          disabled={loading}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#1DA1F2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Fetching...' : 'Fetch Bookmarks'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '8px', marginBottom: '1rem', color: '#c33' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {bookmarks.length > 0 && (
        <div>
          <h2>Found {bookmarks.length} Bookmarks</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: 'white',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {bookmark.author_name || bookmark.author_username || 'Unknown'}
                  </strong>
                  {bookmark.author_username && (
                    <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                      @{bookmark.author_username}
                    </span>
                  )}
                </div>

                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem', lineHeight: '1.5' }}>
                  {bookmark.text}
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  <span>👍 {bookmark.public_metrics?.like_count || 0}</span>
                  <span>🔄 {bookmark.public_metrics?.retweet_count || 0}</span>
                  <span>💬 {bookmark.public_metrics?.reply_count || 0}</span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#999' }}>
                  {new Date(bookmark.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {bookmark.url && (
                    <>
                      {' • '}
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1DA1F2' }}
                      >
                        View on X
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
