# X Liked Tweets Fetcher

A React app with GitHub Actions automation to fetch and display X (Twitter) liked tweets.

> **Note:** Originally designed for bookmarks, but X's Bookmarks API requires OAuth 2.0 which cannot be automated. This version fetches **liked tweets** instead, which works perfectly with OAuth 1.0a automation!

## 🚀 Features

- Automatically fetches X liked tweets via GitHub Actions
- Converts liked tweets to markdown blog posts
- Runs on schedule or on every push to main
- Full debugging and error tracking

## ⚙️ Setup

### 1. OAuth 1.0a Credentials Required

The X Liked Tweets API works with OAuth 1.0a authentication. See **[OAUTH_SETUP.md](./OAUTH_SETUP.md)** for detailed instructions on:
- Creating a X Developer account
- Getting your OAuth credentials
- Setting up GitHub Secrets
- Troubleshooting common issues

### 2. Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `X_API_KEY` - Your API Key (Consumer Key)
- `X_API_SECRET` - Your API Key Secret (Consumer Secret)  
- `X_ACCESS_TOKEN` - Your Access Token
- `X_ACCESS_TOKEN_SECRET` - Your Access Token Secret
- `X_USERNAME` - Your X username (without @)
- `MAX_BOOKMARKS` - (Optional) Number of bookmarks to fetch (default: 5)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Locally (Optional)

Create a `.env` file with your credentials (see OAUTH_SETUP.md) and run:

```bash
npm run fetch-x-bookmarks
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run fetch-x-bookmarks` - Fetch X bookmarks (requires OAuth credentials)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🔄 GitHub Actions Workflow

The workflow runs:
- ✅ On every push to `main`
- ✅ Daily at 9:00 AM UTC
- ✅ Manually via Actions tab

It will:
1. Fetch your X bookmarks
2. Convert them to markdown files
3. Commit and push changes automatically

## 🐛 Debugging

The script includes comprehensive debugging when `DEBUG=true`:
- Environment configuration
- API request/response details
- File operations
- Error stack traces

View debug output in GitHub Actions workflow runs.

## 📚 Tech Stack

- React 19 + TypeScript
- Vite
- X API v2 (OAuth 1.0a)
- GitHub Actions

## ⚠️ Important Notes

- **Browser limitations**: The React app cannot fetch bookmarks directly in the browser due to OAuth 1.0a security requirements (consumer secret cannot be exposed)
- **Use GitHub Actions**: The automated workflow is the recommended way to fetch bookmarks
- **Rate limits**: X API has rate limits - adjust `MAX_BOOKMARKS` if needed

## 📖 More Information

- [OAuth Setup Guide](./OAUTH_SETUP.md) - Detailed authentication setup
- [X API Documentation](https://developer.x.com/en/docs/twitter-api)
- [Bookmarks Endpoint](https://developer.x.com/en/docs/twitter-api/bookmarks/introduction)

---

# Original Vite + React Template Info

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
