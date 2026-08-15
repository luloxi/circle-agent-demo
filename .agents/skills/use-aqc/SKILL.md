---
name: use-aqc
description: "Use Agent Query Composer and Circle Marketplace as a buyer. Each agent must pay with its own Circle Agent Wallet — never a hosted Vercel CLI session or the deployer's USDC. Triggers on: AQC, Agent Query Composer, pay via this demo, hosted live wallet, circle-agent-demo, agent.md."
---

Follow the public skill (single source of truth):

- Local: `public/agent.md`
- Hosted: https://circle-agent-demo.vercel.app/agent.md

```bash
curl -sL https://circle-agent-demo.vercel.app/agent.md
```

**Hard rule:** live sign/pay only on the user's machine with that user's `circle wallet login`. The shared site is Demo + Discovery only.
