---
name: railway-deploy
description: "Deploy, manage, and maintain Railway projects via the GraphQL API v2. Covers the full lifecycle: create projects, wire up GitHub repos or Docker images, set env vars, trigger deploys, add domains, view logs, rollback, and monitor deployment status. Use this skill whenever the user mentions Railway, deploying to Railway, Railway projects, Railway services, Railway environments, Railway domains, Railway logs, Railway deployments, Railway variables, or any infrastructure task that targets the Railway platform. Also trigger on 'deploy my app', 'push to production on Railway', 'check Railway logs', 'add a domain on Railway', 'rollback deployment', 'set env vars on Railway', 'redeploy', 'railway status', or any variant."
---

# Railway Deploy & Manage Skill

## Overview

This skill gives Claude full control over Railway infrastructure via the **GraphQL API v2** at `https://backboard.railway.com/graphql/v2`. It covers projects, services, deployments, environment variables, domains, environments, volumes, and observability.

**Helper script:** This skill ships with `railway_api.py` in the same directory. Run it via bash for all Railway operations. It handles auth, error formatting, and pagination automatically.

---

## Authentication

Every Railway API call requires a **Bearer token** in the `Authorization` header.

**Where to get the token:**
- **Personal token** (full account access) — https://railway.com/account/tokens
- **Project token** (scoped to one project) — project settings in the Railway dashboard

**How Claude should use it:**
1. Check if the user provided the token in the conversation, or if it's stored in a known config file.
2. If not available, ask the user for it once, then reuse it for all subsequent calls in the session.
3. **Never hardcode tokens in scripts that get saved to disk** — pass them as arguments or env vars.
4. Pass as header: `Authorization: Bearer <token>`

---

## Execution Method

**Always use the bundled `railway_api.py` helper script** located in the same directory as this SKILL.md. Run it via bash:

```bash
python3 /path/to/railway_api.py --token "<TOKEN>" <command> [args...]
```

If the helper script is unavailable, fall back to inline Python or curl. See the "Raw GraphQL Reference" section below.

---

## Helper Script Commands

The `railway_api.py` script supports these commands:

### Projects
```bash
railway_api.py --token T whoami
railway_api.py --token T projects
railway_api.py --token T project-get --id <PROJECT_ID>
railway_api.py --token T project-create --name "my-app" [--description "desc"] [--team-id ID]
railway_api.py --token T project-delete --id <PROJECT_ID>
```

### Services
```bash
railway_api.py --token T service-create --project-id PID --name web --repo owner/repo [--branch main]
railway_api.py --token T service-create-docker --project-id PID --name api --image nginx:latest
railway_api.py --token T service-create-empty --project-id PID --name worker
railway_api.py --token T service-update --service-id SID --env-id EID [--build-command "npm run build"] [--start-command "npm start"] [--root-dir ./app] [--health-path /health] [--replicas 2] [--region us-west1] [--cron "0 * * * *"]
railway_api.py --token T service-delete --id <SERVICE_ID>
```

### Deployments
```bash
railway_api.py --token T deploy --service-id SID --env-id EID [--commit-sha SHA]
railway_api.py --token T redeploy --service-id SID --env-id EID
railway_api.py --token T deployments --service-id SID --env-id EID [--limit 10]
railway_api.py --token T deployment-get --id <DEPLOY_ID>
railway_api.py --token T build-logs --deployment-id DID
railway_api.py --token T runtime-logs --deployment-id DID
railway_api.py --token T http-logs --deployment-id DID
railway_api.py --token T rollback --deployment-id DID
railway_api.py --token T restart --deployment-id DID
railway_api.py --token T stop --deployment-id DID
railway_api.py --token T cancel --deployment-id DID
```

### Environment Variables
```bash
railway_api.py --token T vars-get --project-id PID --service-id SID --env-id EID
railway_api.py --token T vars-set --project-id PID --service-id SID --env-id EID --vars '{"KEY":"value","KEY2":"value2"}'
```

### Environments
```bash
railway_api.py --token T environments --project-id PID
railway_api.py --token T env-create --project-id PID --name staging [--ephemeral]
```

### Domains
```bash
railway_api.py --token T domain-create --service-id SID --env-id EID
railway_api.py --token T custom-domain-create --service-id SID --env-id EID --domain api.example.com
railway_api.py --token T domain-status --id DOMAIN_ID --project-id PID
```

### Volumes
```bash
railway_api.py --token T volume-create --project-id PID --service-id SID --env-id EID --mount-path /data
railway_api.py --token T volume-backup --volume-id VID
```

### Utilities
```bash
railway_api.py --token T regions
railway_api.py --token T project-token-info   # use with project tokens
```

---

## Raw GraphQL Reference

When the helper script isn't available, use these queries directly.

### Standard Python template
```python
import requests, json

API = "https://backboard.railway.com/graphql/v2"

def gql(token, query, variables=None):
    r = requests.post(API, json={"query": query, "variables": variables or {}},
                      headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    r.raise_for_status()
    d = r.json()
    if "errors" in d:
        raise Exception(json.dumps(d["errors"], indent=2))
    return d["data"]
```

### Standard curl template
```bash
curl -s https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"...","variables":{...}}'
```

---

### PROJECTS

**List all projects:**
```graphql
query { projects { edges { node { id name description updatedAt } } } }
```

**Get project with services and environments:**
```graphql
query($id: String!) {
  project(id: $id) {
    id name description
    environments { edges { node { id name } } }
    services { edges { node { id name } } }
  }
}
```

**Create project:**
```graphql
mutation($input: ProjectCreateInput!) {
  projectCreate(input: $input) { id name description }
}
# variables: {"input": {"name": "my-project", "description": "optional", "teamId": "optional-workspace-id"}}
```

**Update project:**
```graphql
mutation($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input) { id name }
}
```

**Delete project:**
```graphql
mutation($id: String!) { projectDelete(id: $id) }
```

---

### SERVICES

**Create from GitHub:**
```graphql
mutation($input: ServiceCreateInput!) {
  serviceCreate(input: $input) { id name }
}
# variables: {"input": {"projectId": "...", "name": "web", "source": {"repo": "owner/repo"}, "branch": "main"}}
```

**Create from Docker image:**
```graphql
# variables: {"input": {"projectId": "...", "name": "api", "source": {"image": "nginx:latest"}}}
```

**Update service instance (build/deploy settings):**
```graphql
mutation($environmentId: String!, $input: ServiceInstanceUpdateInput!, $serviceId: String!) {
  serviceInstanceUpdate(environmentId: $environmentId, input: $input, serviceId: $serviceId)
}
# input fields: buildCommand, startCommand, rootDirectory, watchPatterns, healthcheckPath,
#               healthcheckTimeout, numReplicas, sleepApplication, region, cronSchedule
```

**Deploy a service:**
```graphql
mutation($environmentId: String!, $serviceId: String!) {
  serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId)
}
# Add commitSha argument to deploy a specific commit
```

**Redeploy (same commit):**
```graphql
mutation($environmentId: String!, $serviceId: String!) {
  serviceInstanceRedeploy(environmentId: $environmentId, serviceId: $serviceId)
}
```

**Delete service:**
```graphql
mutation($id: String!) { serviceDelete(id: $id) }
```

---

### DEPLOYMENTS

**List deployments:**
```graphql
query($first: Int, $input: DeploymentListInput!) {
  deployments(first: $first, input: $input) {
    edges { node { id status createdAt staticUrl meta { commitMessage commitHash branch } } }
  }
}
# variables: {"first": 10, "input": {"environmentId": "...", "serviceId": "..."}}
```

**Get build logs:**
```graphql
query($deploymentId: String!) {
  buildLogs(deploymentId: $deploymentId) { message timestamp severity }
}
```

**Get runtime logs:**
```graphql
query($deploymentId: String!) {
  deploymentLogs(deploymentId: $deploymentId) { message timestamp severity }
}
```

**Get HTTP logs:**
```graphql
query($deploymentId: String!) {
  httpLogs(deploymentId: $deploymentId) { timestamp method path statusCode duration }
}
```

**Rollback:** `mutation($id: String!) { deploymentRollback(id: $id) { id status } }`
**Restart:** `mutation($id: String!) { deploymentRestart(id: $id) { id status } }`
**Stop:** `mutation($id: String!) { deploymentStop(id: $id) { id status } }`
**Cancel:** `mutation($id: String!) { deploymentCancel(id: $id) { id status } }`

**Deployment statuses:** BUILDING, DEPLOYING, SUCCESS, FAILED, CRASHED, REMOVED, SLEEPING, SKIPPED, WAITING, QUEUED

---

### ENVIRONMENT VARIABLES

**Get variables:**
```graphql
query($environmentId: String!, $projectId: String!, $serviceId: String!) {
  variables(environmentId: $environmentId, projectId: $projectId, serviceId: $serviceId)
}
```

**Set variables (batch upsert):**
```graphql
mutation($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}
# variables: {"input": {"projectId":"...", "environmentId":"...", "serviceId":"...",
#   "variables": {"NODE_ENV":"production", "DATABASE_URL":"postgres://..."}}}
```
To delete a variable, set its value to `null`.

---

### ENVIRONMENTS

**List:** Query `project(id).environments.edges.node{id,name}`

**Create:**
```graphql
mutation($input: EnvironmentCreateInput!) {
  environmentCreate(input: $input) { id name }
}
# variables: {"input": {"projectId": "...", "name": "staging"}}
# Optional: "ephemeral": true for PR environments
```

---

### DOMAINS

**Add Railway domain (*.railway.app):**
```graphql
mutation($input: ServiceDomainCreateInput!) {
  serviceDomainCreate(input: $input) { id domain }
}
# variables: {"input": {"environmentId": "...", "serviceId": "..."}}
```

**Add custom domain:**
```graphql
mutation($input: CustomDomainCreateInput!) {
  customDomainCreate(input: $input) { id domain }
}
# variables: {"input": {"environmentId": "...", "serviceId": "...", "domain": "api.example.com"}}
```

**Check domain status:**
```graphql
query($id: String!, $projectId: String!) {
  customDomain(id: $id, projectId: $projectId) {
    id domain
    status { dnsRecords { hostlabel type requiredValue currentValue status } certificateStatus }
  }
}
```

---

### VOLUMES

**Create volume:**
```graphql
mutation($input: VolumeCreateInput!) {
  volumeCreate(input: $input) { id name mountPath }
}
# variables: {"input": {"projectId":"...", "environmentId":"...", "serviceId":"...", "mountPath":"/data"}}
```

---

### UTILITIES

**Whoami:** `query { me { id email name } }`
**Project token info:** `query { projectToken { projectId environmentId } }`
**List regions:** `query { regions { name displayName } }`

---

## Common Workflows

### Full deploy from GitHub repo (end-to-end)
1. `project-create` → get projectId
2. `project-get` → get production environmentId
3. `service-create` with repo/branch → get serviceId
4. `vars-set` → batch set all env vars
5. `domain-create` → get public *.railway.app URL
6. `deployments` → poll status until SUCCESS
7. (Optional) `custom-domain-create` → add production domain, configure DNS

### Rollback a broken deployment
1. `deployments` → find one with `canRollback: true` and `status: SUCCESS`
2. `rollback` → point to that deployment ID
3. `deployment-get` → verify new deployment is SUCCESS

### Update env vars and redeploy
1. `vars-set` → upsert new values
2. `redeploy` → Railway auto-redeploys on var changes, but force it if needed

### Check deployment health
1. `deployments` → get latest with status SUCCESS
2. `runtime-logs` → check for errors
3. `http-logs` → check response codes
4. `domain-status` → verify DNS and SSL certificate

---

## Error Handling

| Error | Meaning | Fix |
|---|---|---|
| 401 Unauthorized | Token invalid/expired | Regenerate at railway.com/account/tokens |
| "Commit not found" | commitSha not in repo | Verify SHA exists in the connected GitHub repo |
| "Project not found" | Wrong ID or no access | Check project ID; ensure token has access |
| `canRollback: false` | Deployment can't be rolled back | Choose a different deployment |
| GraphQL `errors` array | API-level error | Railway returns HTTP 200 even on GQL errors — always check |

---

## Best Practices

1. **Always confirm destructive actions** (delete project/service, stop deployment) with the user before executing.
2. **Batch env var changes** with `variableCollectionUpsert` — never set them one at a time.
3. **Poll deployment status** after triggering deploys — check every 5-10s until it leaves BUILDING/DEPLOYING.
4. **Use project tokens** for CI/CD instead of personal tokens when possible.
5. **Save IDs** — after creating resources, store project/service/environment IDs for later commands.
6. **Relay pagination** — list queries use `first`, `after`, `edges`, `node` cursor pagination.

---

## Reference Links

- [Railway API Overview](https://docs.railway.com/integrations/api)
- [GraphQL Introduction](https://docs.railway.com/integrations/api/graphql-overview)
- [API Cookbook](https://docs.railway.com/integrations/api/api-cookbook)
- [Manage Projects](https://docs.railway.com/integrations/api/manage-projects)
- [Manage Services](https://docs.railway.com/integrations/api/manage-services)
- [Manage Deployments](https://docs.railway.com/integrations/api/manage-deployments)
- [Manage Variables](https://docs.railway.com/integrations/api/manage-variables)
- [Manage Environments](https://docs.railway.com/integrations/api/manage-environments)
- [Manage Domains](https://docs.railway.com/integrations/api/manage-domains)
- [Manage Volumes](https://docs.railway.com/integrations/api/manage-volumes)
- [GraphiQL Playground](https://railway.com/graphiql)
