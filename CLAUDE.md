# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Kubernetes API proxy server written in Go. It acts as an intermediary between clients and the Kubernetes API server, handling authentication, authorization, and request proxying.

## Build & Run Commands

Run from the `k8s-proxy-server/` directory:

```bash
# Run the server locally
make run

# Build the binary (outputs to bin/)
make build

# Clean build artifacts
make clean
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_PORT` | `8080` | Port the proxy server listens on |
| `K8S_MASTER_URL` | `https://kubernetes.default.svc` | Kubernetes API server URL |
| `K8S_TOKEN` | (empty) | ServiceAccount token for K8s authentication |
| `K8S_CA_CERT_PATH` | `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` | Path to K8s CA certificate |
| `DEBUG_MODE` | `false` | Enable debug logging |

## Architecture

```
k8s-proxy-server/
├── cmd/server/main.go      # Application entry point
├── internal/
│   ├── config/             # Environment variable loading (Config struct)
│   ├── proxy/              # Reverse proxy implementation
│   │   ├── handler.go      # HTTP request handler
│   │   └── transport.go    # K8s API transport with TLS
│   ├── middleware/         # HTTP middleware (auth, logging, CORS)
│   ├── auth/               # External identity provider integration (Google, OIDC)
│   └── k8s/                # Kubernetes client-go initialization
├── pkg/                    # Public utilities (optional)
└── deploy/                 # Deployment configs (Dockerfile, K8s manifests)
```

The Go module path is `github.com/ForrestCrew/serving-user-broker`.
