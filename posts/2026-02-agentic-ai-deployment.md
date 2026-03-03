---
title: "Building a Production Agentic AI System: Lessons from Automating Kubernetes Deployments"
date: 2026-02-20
tags:
  - Agentic AI
  - LangGraph
  - Kubernetes
  - Production ML
summary: "How I built a 22-node LangGraph workflow that reduced Kubernetes deployment complexity by 72% and cut deployment time from 2-4 hours to 30 minutes. Deep dive into checkpoint-based resumption, HIPAA compliance, and production safety guards."
---

> **TL;DR:** I built a 22-node LangGraph workflow that accepts natural language ("Deploy patient-dashboard to dev") and orchestrates the full Kubernetes deployment lifecycle across GitLab, Terraform, ArgoCD, and AWS — reducing deployment complexity by 72% and cutting time from 2-4 hours to 30 minutes. Here's what building a production-grade agentic system actually taught me.

## The Problem: Five Systems, One Deployment

Deploying a Streamlit application to a Kubernetes cluster inside a regulated healthcare environment meant touching five distinct systems in the right order:

1. **GitLab** — write a Dockerfile, CI/CD pipeline, and Helm chart; commit to the right branch
2. **Terraform** — provision an SSL certificate via AWS ACM; wait for DNS validation
3. **AWS Route53** — configure DNS records pointing at the application load balancer
4. **ArgoCD** — sync the Kubernetes application from the Git source of truth
5. **AWS** — verify the ALB hostname, confirm certificate issuance, validate health

Each step had its own CLI, its own credential chain, and its own failure modes. Getting all of this right once required deep familiarity with the infrastructure. Getting it right repeatedly — for every new app, every new environment — required a specialist.

The goal was clear: a data scientist should be able to type "Deploy my-dashboard to dev" and walk away. No Kubernetes knowledge required.

## Architecture Overview

The system is built on three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Streamlit UI                             │
│  Natural language input → Real-time progress → Deployment URL   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   DeploymentOrchestrator                        │
│           LangGraph StateGraph · SQLite Checkpoints             │
│                                                                 │
│  parse_request → analyze_repo → generate_configs → commit_configs│
│       → request_cert → wait_cert → parse_cert_output            │
│       → setup_helm_chart → deploy_k8s → retrieve_lb_hostname    │
│       → configure_dns → wait_dns → parse_dns_output             │
│       → verify_health → notify_success                          │
│                    ↕ (error_recovery / rollback)                │
└──────┬───────────┬──────────┬──────────┬───────────┬────────────┘
       │           │          │          │           │
   GitLab CI   Terraform   ArgoCD    AWS ACM/      DNS
   (Kaniko)    (HCL/MR)   (GitOps)  Route53/ALB  (Route53)
```

The 22-node LangGraph StateGraph is the core. Each node is a pure function that takes a `DeploymentState` TypedDict and returns an updated state. LangGraph handles the graph traversal, conditional edge routing, and — crucially — checkpoint persistence.

## Why LangGraph (and Not Just Chained Prompts)

Before settling on LangGraph, the natural instinct is to reach for something simpler: a Python function that calls the OpenAI API, parses the response, and calls the next function. That works for demos. It doesn't work in production.

Here's why the state machine model matters for this kind of system:

**Workflows have approval gates.** Terraform pipelines in a regulated environment require manual approval before running. The system can't simply block a thread waiting for a human to click a button — that could be minutes or hours. A state machine can serialize its state to disk, terminate cleanly, and resume exactly where it left off when conditions are met.

**Errors require routing, not just retry.** A "folder not found" in GitLab requires a different response than a transient API timeout. LangGraph's conditional edge routing lets you define explicit recovery strategies per error class, rather than wrapping everything in `try/except` and hoping for the best.

**Progress must be observable.** When a user submits a deployment request, they need to see what's happening. LangGraph's `astream()` yields state updates node-by-node, which the Streamlit UI maps to a real-time progress bar. This is impossible with a monolithic function.

**State must survive restarts.** Kubernetes pods get evicted. Network connections drop. The SQLite checkpoint database means a deployment that starts on a Monday can survive a pod restart and resume Tuesday without any lost work.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Workflow orchestration | LangGraph 0.2.16 | State machine with built-in checkpointing |
| LLM | GPT-4 via LiteLLM proxy | Organization's internal proxy for cost control |
| UI | Streamlit 1.37 | Native Python, real-time streaming via astream() |
| State persistence | SQLite + SQLCipher | No external DB needed; encrypted at rest for HIPAA |
| GitLab integration | python-gitlab 4.12 | Repository ops, pipeline monitoring, MR creation |
| Infrastructure-as-code | python-hcl2 3.x | Parse and modify Terraform HCL files programmatically |
| Container build | Kaniko (GitLab CI) | Rootless Docker builds in Kubernetes |
| GitOps deployment | ArgoCD API | Sync Kubernetes apps from Git |
| Cloud (primary) | AWS (ECR, ACM, ALB, Route53) | Certificate provisioning, DNS, image registry |
| Secret management | AWS Secrets Manager | Token rotation without pod restarts |
| Data validation | Pydantic v2 | Input validation at system boundaries |

## Results

Measured against the previous manual process:

| Metric | Before | After |
|--------|--------|-------|
| Deployment complexity | Baseline | **72% reduction** |
| Deployment time | 2-4 hours | **30 minutes** |
| Infrastructure knowledge required | Kubernetes, Terraform, GitLab CI, AWS, DNS | **Natural language** |
| Estimated annual time saved | — | ~4,000 hours (10 deployments/month) |

## Key Lessons Learned

**1. Treat your AI workflow like a distributed system, not a script.**
Checkpointing, idempotency, and recovery paths are as important in LLM workflows as they are in microservices. Design for failure from the start.

**2. Polling is often the right answer.**
Webhooks require an exposed endpoint. Polling requires a loop. In an enterprise environment with strict network controls, polling across your own SQLite database is vastly simpler to operate and debug.

**3. Temperature 0.1 for infrastructure generation.**
Creativity is a liability when the LLM is writing Dockerfiles. Use deterministic settings and constrain the output format strictly. Always have a fallback.

**4. State machines make agentic systems auditable.**
Every state transition in LangGraph is a discrete, logged event. When something goes wrong (and it will), you can replay the state history and identify exactly where it diverged. This is invaluable for debugging in production.

**5. The hardest part isn't the AI.**
The genuinely hard problems in this system — checkpoint-based resumption, encrypted state storage, multi-system error recovery — have nothing to do with LLMs. They're distributed systems problems. The LLM is the easy part.

---

*Built with: LangGraph · LiteLLM/GPT-4 · Streamlit · GitLab API · Terraform · ArgoCD · AWS (ECR, ACM, Route53, ALB) · SQLite/SQLCipher · Kubernetes · Kaniko · Python 3.11*
