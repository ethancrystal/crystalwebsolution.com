# GitHub API Patterns

## Authentication

Pass a Personal Access Token via the `GITHUB_TOKEN` environment variable.

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Scope needed:
- Public repos: none
- Private repos: `repo`

## Rate Limits

| Type | Requests | Window |
|------|----------|--------|
| Unauthenticated | 60 | per hour |
| Authenticated (PAT) | 5,000 | per hour |
| GitHub App | 15,000 | per hour |

The scanner auto-waits when rate limited.

## Key Endpoints

### Repository
```
GET /repos/{owner}/{repo}
```

### Branches
```
GET /repos/{owner}/{repo}/branches
GET /repos/{owner}/{repo}/branches/{branch}
```

### Commits
```
GET /repos/{owner}/{repo}/commits?sha={branch}&per_page=100
```

### Pull Requests
```
GET /repos/{owner}/{repo}/pulls?state=open|closed&sort=updated&per_page=100
```

### Issues
```
GET /repos/{owner}/{repo}/issues?state=open&sort=created&per_page=100
```

Note: PRs are included in the issues endpoint. Filter by checking for `pull_request` field.

## Pagination

GitHub returns Link headers. The scanner follows `rel="next"` URLs automatically up to a configured page limit.
