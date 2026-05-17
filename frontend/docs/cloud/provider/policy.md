# Provider Policy

Terms, requirements, and guidelines for GPU providers on WorldLand Cloud.

## Eligibility Requirements

### Hardware Requirements

| Component      | Minimum                   | Notes                              |
| -------------- | ------------------------- | ---------------------------------- |
| **GPU**        | NVIDIA GTX 1080 or higher | CUDA compute capability 6.0+       |
| **VRAM**       | 8GB                       | Higher VRAM enables more workloads |
| **System RAM** | 16GB                      | Per GPU recommended                |
| **Storage**    | 100GB SSD                 | NVMe preferred                     |
| **Network**    | 100 Mbps symmetric        | 1 Gbps recommended                 |
| **Public IP**  | Required                  | Static IP strongly recommended     |

### Software Requirements

- Ubuntu 20.04 LTS or 22.04 LTS
- Latest NVIDIA drivers (525+)
- Docker with NVIDIA Container Toolkit
- Kubernetes components (kubelet, kubeadm)

### Network Requirements

- Port forwarding capability
- NodePort range accessible (30000-32767)
- Stable internet connection
- Low latency to major regions

## Service Level Agreement (SLA)

### Uptime Requirements

| Tier       | Minimum Uptime | Penalty                      |
| ---------- | -------------- | ---------------------------- |
| Standard   | 95%            | Warning                      |
| Enhanced   | 99%            | Required for premium listing |
| Enterprise | 99.9%          | Priority matching            |

### Calculating Uptime

```
Uptime % = (Total Time - Downtime) / Total Time × 100
```

::: warning Downtime Definition
Downtime includes:

- Node unreachable
- GPU unavailable
- Network connectivity issues
- Unplanned maintenance
  :::

### Planned Maintenance

- Notify 24 hours in advance (via dashboard)
- Maximum 4 hours planned maintenance per month
- Coordinate during low-usage periods

## Pricing Guidelines

### Setting Your Price

You have full control over your pricing:

| GPU Model | Market Range (WLC/hour) | Recommended |
| --------- | ----------------------- | ----------- |
| RTX 4090  | 0.40 - 0.70             | 0.50        |
| RTX 3090  | 0.30 - 0.50             | 0.35        |
| RTX 3080  | 0.25 - 0.40             | 0.30        |
| Tesla T4  | 0.20 - 0.35             | 0.25        |
| A100 40GB | 0.80 - 1.50             | 1.00        |
| A100 80GB | 1.20 - 2.00             | 1.50        |

### Price Changes

- Prices can be updated anytime
- Changes apply to new jobs only
- Existing jobs retain original price

## Quality Standards

### Container Requirements

All customer containers must have:

- ✅ Full GPU access (nvidia.com/gpu)
- ✅ Root SSH access
- ✅ Specified CPU/Memory allocation
- ✅ Network connectivity
- ✅ CUDA drivers functional

### Performance Standards

| Metric                 | Requirement                       |
| ---------------------- | --------------------------------- |
| **Container startup**  | < 60 seconds                      |
| **SSH availability**   | < 30 seconds after Running status |
| **GPU initialization** | nvidia-smi responsive             |
| **Network latency**    | < 100ms to container              |

### Monitoring

WorldLand monitors:

- Node health via heartbeat
- GPU availability
- Resource utilization
- Customer feedback

## Prohibited Activities

### Providers Must NOT:

❌ Terminate customer containers without cause  
❌ Access customer container data  
❌ Throttle resources below allocation  
❌ Misrepresent hardware specifications  
❌ Share customer information  
❌ Run unauthorized workloads on customer containers

### Immediate Termination

The following result in immediate removal:

- Security breach of customer containers
- Fraudulent resource reporting
- Repeated SLA violations
- Illegal content or activities

## Revenue & Payments

### Revenue Split

```
Customer Payment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provider: 90% │██████████████████░░│
Protocol: 10% │██░░░░░░░░░░░░░░░░░░│
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Payment Schedule

- Payments processed on-chain
- Real-time settlement upon job completion
- Automatic deposit to provider wallet

### Payment Disputes

1. Customer initiates dispute
2. Evidence review (logs, metrics)
3. Resolution within 48 hours
4. Arbitration if unresolved

## Data Protection

### Provider Responsibilities

- **No access** to customer container contents
- **No logging** of customer data
- **Secure deletion** of container storage after job termination
- **Network isolation** between customer containers

### Ephemeral Storage

All customer data is ephemeral:

- Deleted immediately on job termination
- No backups or snapshots by default
- Customers responsible for their own data backup

## Compliance

### Required Compliance

Providers must comply with:

- Local laws and regulations
- Export control requirements
- GDPR (if serving EU customers)
- Network security best practices

### Audit Rights

WorldLand reserves the right to:

- Request hardware verification
- Audit resource availability
- Review operational practices
- Conduct security assessments

## Account Management

### Suspension

Provider accounts may be suspended for:

- SLA violations
- Customer complaints
- Security concerns
- Policy violations

### Appeal Process

1. Receive suspension notice
2. Submit appeal within 7 days
3. Review by WorldLand team
4. Decision within 14 days

### Voluntary Withdrawal

To stop providing resources:

1. Set status to "Maintenance"
2. Wait for active jobs to complete
3. Request removal from network
4. Settle any pending payments

## Updates to Policy

This policy may be updated periodically. Providers will be notified of material changes:

- 30 days advance notice for significant changes
- Immediate effect for security-related updates
- Continued operation implies acceptance

::: info Questions?
For policy questions, contact support@worldland.cloud or visit our Discord.
:::

## Next Steps

- [How to Provide](/cloud/provider/how-to-provide) - Setup guide
- [Provider Rewards](/tokenomics/provider-rewards) - Earnings structure
