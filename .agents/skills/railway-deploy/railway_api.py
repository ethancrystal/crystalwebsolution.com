#!/usr/bin/env python3
"""
Railway GraphQL API v2 CLI helper.
Usage: python3 railway_api.py --token <TOKEN> <command> [options]

Commands:
  whoami, projects, project-get, project-create, project-delete,
  service-create, service-create-docker, service-create-empty, service-update, service-delete,
  deploy, redeploy, deployments, deployment-get,
  build-logs, runtime-logs, http-logs,
  rollback, restart, stop, cancel,
  vars-get, vars-set,
  environments, env-create,
  domain-create, custom-domain-create, domain-status,
  volume-create, volume-backup,
  regions, project-token-info
"""

import argparse
import json
import sys
import urllib.request
import urllib.error

API_URL = "https://backboard.railway.com/graphql/v2"


def gql(token, query, variables=None):
    """Execute a GraphQL query against Railway API v2."""
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr)
        if body:
            print(body, file=sys.stderr)
        sys.exit(1)

    if "errors" in data:
        print("GraphQL errors:", file=sys.stderr)
        print(json.dumps(data["errors"], indent=2), file=sys.stderr)
        sys.exit(1)

    return data.get("data")


def pp(obj):
    """Pretty-print JSON."""
    print(json.dumps(obj, indent=2))


# ── Projects ────────────────────────────────────────────────────────────────

def cmd_whoami(args):
    pp(gql(args.token, "query { me { id email name } }"))


def cmd_projects(args):
    pp(gql(args.token, """
        query { projects { edges { node { id name description updatedAt } } } }
    """))


def cmd_project_get(args):
    pp(gql(args.token, """
        query($id: String!) {
          project(id: $id) {
            id name description
            environments { edges { node { id name } } }
            services { edges { node { id name } } }
          }
        }
    """, {"id": args.id}))


def cmd_project_create(args):
    inp = {"name": args.name}
    if args.description:
        inp["description"] = args.description
    if args.team_id:
        inp["teamId"] = args.team_id
    pp(gql(args.token, """
        mutation($input: ProjectCreateInput!) {
          projectCreate(input: $input) { id name description }
        }
    """, {"input": inp}))


def cmd_project_delete(args):
    pp(gql(args.token, """
        mutation($id: String!) { projectDelete(id: $id) }
    """, {"id": args.id}))


# ── Services ────────────────────────────────────────────────────────────────

def cmd_service_create(args):
    inp = {
        "projectId": args.project_id,
        "name": args.name,
        "source": {"repo": args.repo},
    }
    if args.branch:
        inp["branch"] = args.branch
    pp(gql(args.token, """
        mutation($input: ServiceCreateInput!) {
          serviceCreate(input: $input) { id name }
        }
    """, {"input": inp}))


def cmd_service_create_docker(args):
    inp = {
        "projectId": args.project_id,
        "name": args.name,
        "source": {"image": args.image},
    }
    pp(gql(args.token, """
        mutation($input: ServiceCreateInput!) {
          serviceCreate(input: $input) { id name }
        }
    """, {"input": inp}))


def cmd_service_create_empty(args):
    inp = {"projectId": args.project_id, "name": args.name}
    pp(gql(args.token, """
        mutation($input: ServiceCreateInput!) {
          serviceCreate(input: $input) { id name }
        }
    """, {"input": inp}))


def cmd_service_update(args):
    inp = {}
    if args.build_command:
        inp["buildCommand"] = args.build_command
    if args.start_command:
        inp["startCommand"] = args.start_command
    if args.root_dir:
        inp["rootDirectory"] = args.root_dir
    if args.health_path:
        inp["healthcheckPath"] = args.health_path
    if args.replicas is not None:
        inp["numReplicas"] = args.replicas
    if args.region:
        inp["region"] = args.region
    if args.cron:
        inp["cronSchedule"] = args.cron
    if not inp:
        print("No update fields provided.", file=sys.stderr)
        sys.exit(1)
    pp(gql(args.token, """
        mutation($environmentId: String!, $input: ServiceInstanceUpdateInput!, $serviceId: String!) {
          serviceInstanceUpdate(environmentId: $environmentId, input: $input, serviceId: $serviceId)
        }
    """, {"environmentId": args.env_id, "serviceId": args.service_id, "input": inp}))


def cmd_service_delete(args):
    pp(gql(args.token, """
        mutation($id: String!) { serviceDelete(id: $id) }
    """, {"id": args.id}))


# ── Deployments ─────────────────────────────────────────────────────────────

def cmd_deploy(args):
    q = """
        mutation($environmentId: String!, $serviceId: String!%s) {
          serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId%s)
        }
    """
    variables = {"environmentId": args.env_id, "serviceId": args.service_id}
    if args.commit_sha:
        q = q % (", $commitSha: String", ", commitSha: $commitSha")
        variables["commitSha"] = args.commit_sha
    else:
        q = q % ("", "")
    pp(gql(args.token, q, variables))


def cmd_redeploy(args):
    pp(gql(args.token, """
        mutation($environmentId: String!, $serviceId: String!) {
          serviceInstanceRedeploy(environmentId: $environmentId, serviceId: $serviceId)
        }
    """, {"environmentId": args.env_id, "serviceId": args.service_id}))


def cmd_deployments(args):
    limit = args.limit or 10
    pp(gql(args.token, """
        query($first: Int, $input: DeploymentListInput!) {
          deployments(first: $first, input: $input) {
            edges { node {
              id status createdAt updatedAt staticUrl canRollback
              meta { commitMessage commitHash branch }
            }}
          }
        }
    """, {"first": limit, "input": {"environmentId": args.env_id, "serviceId": args.service_id}}))


def cmd_deployment_get(args):
    pp(gql(args.token, """
        query($id: String!) {
          deployment(id: $id) {
            id status createdAt updatedAt staticUrl canRollback
            meta { commitMessage commitHash branch }
          }
        }
    """, {"id": args.id}))


def cmd_build_logs(args):
    pp(gql(args.token, """
        query($deploymentId: String!) {
          buildLogs(deploymentId: $deploymentId) { message timestamp severity }
        }
    """, {"deploymentId": args.deployment_id}))


def cmd_runtime_logs(args):
    pp(gql(args.token, """
        query($deploymentId: String!) {
          deploymentLogs(deploymentId: $deploymentId) { message timestamp severity }
        }
    """, {"deploymentId": args.deployment_id}))


def cmd_http_logs(args):
    pp(gql(args.token, """
        query($deploymentId: String!) {
          httpLogs(deploymentId: $deploymentId) { timestamp method path statusCode duration }
        }
    """, {"deploymentId": args.deployment_id}))


def cmd_rollback(args):
    pp(gql(args.token, """
        mutation($id: String!) { deploymentRollback(id: $id) { id status } }
    """, {"id": args.deployment_id}))


def cmd_restart(args):
    pp(gql(args.token, """
        mutation($id: String!) { deploymentRestart(id: $id) { id status } }
    """, {"id": args.deployment_id}))


def cmd_stop(args):
    pp(gql(args.token, """
        mutation($id: String!) { deploymentStop(id: $id) { id status } }
    """, {"id": args.deployment_id}))


def cmd_cancel(args):
    pp(gql(args.token, """
        mutation($id: String!) { deploymentCancel(id: $id) { id status } }
    """, {"id": args.deployment_id}))


# ── Variables ───────────────────────────────────────────────────────────────

def cmd_vars_get(args):
    pp(gql(args.token, """
        query($environmentId: String!, $projectId: String!, $serviceId: String!) {
          variables(environmentId: $environmentId, projectId: $projectId, serviceId: $serviceId)
        }
    """, {"environmentId": args.env_id, "projectId": args.project_id, "serviceId": args.service_id}))


def cmd_vars_set(args):
    variables = json.loads(args.vars)
    pp(gql(args.token, """
        mutation($input: VariableCollectionUpsertInput!) {
          variableCollectionUpsert(input: $input)
        }
    """, {"input": {
        "projectId": args.project_id,
        "environmentId": args.env_id,
        "serviceId": args.service_id,
        "variables": variables,
    }}))


# ── Environments ────────────────────────────────────────────────────────────

def cmd_environments(args):
    pp(gql(args.token, """
        query($id: String!) {
          project(id: $id) { environments { edges { node { id name } } } }
        }
    """, {"id": args.project_id}))


def cmd_env_create(args):
    inp = {"projectId": args.project_id, "name": args.name}
    if args.ephemeral:
        inp["ephemeral"] = True
    pp(gql(args.token, """
        mutation($input: EnvironmentCreateInput!) {
          environmentCreate(input: $input) { id name }
        }
    """, {"input": inp}))


# ── Domains ─────────────────────────────────────────────────────────────────

def cmd_domain_create(args):
    pp(gql(args.token, """
        mutation($input: ServiceDomainCreateInput!) {
          serviceDomainCreate(input: $input) { id domain }
        }
    """, {"input": {"environmentId": args.env_id, "serviceId": args.service_id}}))


def cmd_custom_domain_create(args):
    pp(gql(args.token, """
        mutation($input: CustomDomainCreateInput!) {
          customDomainCreate(input: $input) { id domain }
        }
    """, {"input": {"environmentId": args.env_id, "serviceId": args.service_id, "domain": args.domain}}))


def cmd_domain_status(args):
    pp(gql(args.token, """
        query($id: String!, $projectId: String!) {
          customDomain(id: $id, projectId: $projectId) {
            id domain
            status {
              dnsRecords { hostlabel type requiredValue currentValue status }
              certificateStatus
            }
          }
        }
    """, {"id": args.id, "projectId": args.project_id}))


# ── Volumes ─────────────────────────────────────────────────────────────────

def cmd_volume_create(args):
    pp(gql(args.token, """
        mutation($input: VolumeCreateInput!) {
          volumeCreate(input: $input) { id name mountPath }
        }
    """, {"input": {
        "projectId": args.project_id,
        "environmentId": args.env_id,
        "serviceId": args.service_id,
        "mountPath": args.mount_path,
    }}))


def cmd_volume_backup(args):
    pp(gql(args.token, """
        mutation($input: VolumeBackupCreateInput!) {
          volumeBackupCreate(input: $input) { id createdAt }
        }
    """, {"input": {"volumeId": args.volume_id}}))


# ── Utilities ───────────────────────────────────────────────────────────────

def cmd_regions(args):
    pp(gql(args.token, "query { regions { name displayName } }"))


def cmd_project_token_info(args):
    pp(gql(args.token, "query { projectToken { projectId environmentId } }"))


# ── CLI Wiring ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Railway GraphQL API v2 CLI")
    parser.add_argument("--token", required=True, help="Railway API token")
    sub = parser.add_subparsers(dest="command", required=True)

    # Projects
    sub.add_parser("whoami")
    sub.add_parser("projects")

    p = sub.add_parser("project-get")
    p.add_argument("--id", required=True)

    p = sub.add_parser("project-create")
    p.add_argument("--name", required=True)
    p.add_argument("--description", default=None)
    p.add_argument("--team-id", default=None)

    p = sub.add_parser("project-delete")
    p.add_argument("--id", required=True)

    # Services
    p = sub.add_parser("service-create")
    p.add_argument("--project-id", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--repo", required=True)
    p.add_argument("--branch", default=None)

    p = sub.add_parser("service-create-docker")
    p.add_argument("--project-id", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--image", required=True)

    p = sub.add_parser("service-create-empty")
    p.add_argument("--project-id", required=True)
    p.add_argument("--name", required=True)

    p = sub.add_parser("service-update")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--build-command", default=None)
    p.add_argument("--start-command", default=None)
    p.add_argument("--root-dir", default=None)
    p.add_argument("--health-path", default=None)
    p.add_argument("--replicas", type=int, default=None)
    p.add_argument("--region", default=None)
    p.add_argument("--cron", default=None)

    p = sub.add_parser("service-delete")
    p.add_argument("--id", required=True)

    # Deployments
    p = sub.add_parser("deploy")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--commit-sha", default=None)

    p = sub.add_parser("redeploy")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)

    p = sub.add_parser("deployments")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--limit", type=int, default=10)

    p = sub.add_parser("deployment-get")
    p.add_argument("--id", required=True)

    for cmd_name in ["build-logs", "runtime-logs", "http-logs"]:
        p = sub.add_parser(cmd_name)
        p.add_argument("--deployment-id", required=True)

    for cmd_name in ["rollback", "restart", "stop", "cancel"]:
        p = sub.add_parser(cmd_name)
        p.add_argument("--deployment-id", required=True)

    # Variables
    p = sub.add_parser("vars-get")
    p.add_argument("--project-id", required=True)
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)

    p = sub.add_parser("vars-set")
    p.add_argument("--project-id", required=True)
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--vars", required=True, help='JSON object: {"KEY":"value",...}')

    # Environments
    p = sub.add_parser("environments")
    p.add_argument("--project-id", required=True)

    p = sub.add_parser("env-create")
    p.add_argument("--project-id", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--ephemeral", action="store_true")

    # Domains
    p = sub.add_parser("domain-create")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)

    p = sub.add_parser("custom-domain-create")
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--domain", required=True)

    p = sub.add_parser("domain-status")
    p.add_argument("--id", required=True)
    p.add_argument("--project-id", required=True)

    # Volumes
    p = sub.add_parser("volume-create")
    p.add_argument("--project-id", required=True)
    p.add_argument("--service-id", required=True)
    p.add_argument("--env-id", required=True)
    p.add_argument("--mount-path", required=True)

    p = sub.add_parser("volume-backup")
    p.add_argument("--volume-id", required=True)

    # Utilities
    sub.add_parser("regions")
    sub.add_parser("project-token-info")

    args = parser.parse_args()

    dispatch = {
        "whoami": cmd_whoami,
        "projects": cmd_projects,
        "project-get": cmd_project_get,
        "project-create": cmd_project_create,
        "project-delete": cmd_project_delete,
        "service-create": cmd_service_create,
        "service-create-docker": cmd_service_create_docker,
        "service-create-empty": cmd_service_create_empty,
        "service-update": cmd_service_update,
        "service-delete": cmd_service_delete,
        "deploy": cmd_deploy,
        "redeploy": cmd_redeploy,
        "deployments": cmd_deployments,
        "deployment-get": cmd_deployment_get,
        "build-logs": cmd_build_logs,
        "runtime-logs": cmd_runtime_logs,
        "http-logs": cmd_http_logs,
        "rollback": cmd_rollback,
        "restart": cmd_restart,
        "stop": cmd_stop,
        "cancel": cmd_cancel,
        "vars-get": cmd_vars_get,
        "vars-set": cmd_vars_set,
        "environments": cmd_environments,
        "env-create": cmd_env_create,
        "domain-create": cmd_domain_create,
        "custom-domain-create": cmd_custom_domain_create,
        "domain-status": cmd_domain_status,
        "volume-create": cmd_volume_create,
        "volume-backup": cmd_volume_backup,
        "regions": cmd_regions,
        "project-token-info": cmd_project_token_info,
    }

    fn = dispatch.get(args.command)
    if fn:
        fn(args)
    else:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
