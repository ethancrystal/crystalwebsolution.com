# Output JSON Schema

The scanner writes a JSON file with this structure:

```json
{
  "meta": {
    "owner": "string",
    "repo": "string",
    "branch": "string",
    "fullUrl": "string",
    "scannedAt": "ISO-8601",
    "depth": "quick|standard|deep"
  },
  "repo": {
    "name": "string",
    "description": "string|null",
    "stars": 0,
    "forks": 0,
    "watchers": 0,
    "visibility": "public|private",
    "license": "string|null",
    "language": "string",
    "defaultBranch": "string",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "archived": false,
    "openIssues": 0
  },
  "activity": {
    "commitsThisWeek": 0,
    "commitsThisMonth": 0,
    "totalCommitsAnalyzed": 0,
    "staleness": "very active|active|moderate|stale|very stale"
  },
  "branches": [
    { "name": "string", "protected": false, "sha": "string" }
  ],
  "commits": [
    { "sha": "string", "message": "string", "author": "string", "date": "ISO-8601" }
  ],
  "pullRequests": {
    "open": [
      { "number": 0, "title": "string", "author": "string", "createdAt": "ISO-8601", "draft": false, "branch": "string" }
    ],
    "count": 0,
    "recentlyMerged": [...]
  },
  "issues": {
    "items": [
      { "number": 0, "title": "string", "labels": ["string"], "author": "string", "createdAt": "ISO-8601", "age": 0 }
    ],
    "count": 0
  },
  "releases": [
    { "tag": "string", "name": "string", "publishedAt": "ISO-8601", "prerelease": false }
  ],
  "contributors": [
    { "login": "string", "contributions": 0 }
  ]
}
```
