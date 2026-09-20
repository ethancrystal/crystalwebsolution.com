# GitHub API Usage Guide

## Authentication

All GitHub API requests require authentication. Use a Personal Access Token (PAT):

```bash
# Set as environment variable
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Create a PAT at: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token

Required scopes:
- **Public repos**: No scope needed
- **Private repos**: `repo` scope
- **Issues/PRs**: `repo` scope (private) or no scope (public)

## Rate Limits

| Token Type | Limit | Window |
|------------|-------|--------|
| Unauthenticated | 60 requests | Per hour |
| Authenticated (PAT) | 5,000 requests | Per hour |
| GitHub App | 15,000 requests | Per hour |

After 5,000 requests (common for large repo analysis), the script waits 5 minutes before retrying.

## Key Endpoints Used

### Repository Info
```
GET /repos/{owner}/{repo}
```
Returns: name, description, default_branch, language, created_at, updated_at, archived, visibility

### Branches
```
GET /repos/{owner}/{repo}/branches
GET /repos/{owner}/{repo}/branches/{branch}
GET /repos/{owner}/{repo}/branches/{branch}/protection
```
Returns: name, commit SHA, protected status, protection rules

### Commits
```
GET /repos/{owner}/{repo}/commits
```
Query params:
- `sha`: branch name
- `per_page`: 30 (max 100)
- `page`: pagination

Returns: SHA, message, author, committer, stats

### Pull Requests
```
GET /repos/{owner}/{repo}/pulls
```
Query params:
- `state`: open, closed, all
- `per_page`: 30
- `sort`: created, updated, popularity
- `direction`: asc, desc

Returns: number, title, state, author, branch info, mergeable status

### Issues
```
GET /repos/{owner}/{repo}/issues
```
Query params:
- `state`: open, closed, all
- `labels`: todo,bug,enhancement (comma-separated)
- `per_page`: 100

Note: Pull requests are also returned in issues endpoint. Filter by `pull_request` field to exclude.

### Releases
```
GET /repos/{owner}/{repo}/releases
GET /repos/{owner}/{repo}/tags
```

## Pagination Strategy

GitHub uses Link headers for pagination. The analyzer follows next links automatically:

```javascript
const links = response.headers.get('link');
// Parse rel="next" URL
```

For repos with many issues/PRs, the analyzer:
1. Fetches first page (100 items)
2. Parses Link header for next page
3. Stops after 5 pages (500 items max) to stay within rate limits

## Error Handling

Common errors:

| Status | Meaning | Action |
|--------|---------|--------|
| 401 | Unauthorized | Check token validity |
| 403 | Rate limited | Wait for reset, retry with exponential backoff |
| 404 | Not found | Repo doesn't exist or no access |
| 422 | Validation failed | Check request parameters |
| 451 | Unavailable (DMCA) | Can't access this repository |

## Example: Fetching All Open Issues with Labels

```javascript
async function getIssues(owner, repo, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const params = new URLSearchParams({
    state: 'open',
    labels: 'todo,bug,enhancement',
    per_page: '100'
  });
  
  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  return await response.json();
}
```
