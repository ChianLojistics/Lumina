# Alertmanager

Routes and deduplicates alerts fired by the rules in [`../prometheus/alerts/rules.yml`](../prometheus/alerts/rules.yml).

## Setup

Alertmanager does not expand `${VAR}`-style environment variables inside
`alertmanager.yml`, so secrets are read from files (the `*_file` config
options) instead. Before starting the stack, copy each `.example` file in
`secrets/` and fill in the real value:

```bash
cd alertmanager/secrets
cp slack_webhook_url.example slack_webhook_url
cp smtp_user.example smtp_user
cp smtp_password.example smtp_password
cp pagerduty_routing_key.example pagerduty_routing_key
# edit each file with the real credential
```

The real files are git-ignored; only the `.example` templates are committed.

## Routing

- All alerts are grouped by `alertname` + `service` (`route.group_by`) so one
  incident produces one notification instead of one per firing time series.
- `severity: warning` alerts go to Slack `#lumina-alerts` only.
- `severity: critical` alerts go to Slack `#lumina-incidents` **and**
  PagerDuty (`route.routes` matches `severity: critical` twice, with
  `continue: true` on the first match so both receivers fire).
- `inhibit_rules` suppresses `HighErrorRate`/`HighLatency` noise for a service
  that's already firing `ServiceDown`, since those are downstream symptoms of
  the same outage.

## On-call & escalation

On-call rotation itself (who is paged, weekly schedule, escalation after N
minutes of no ack) is configured in PagerDuty against the escalation policy
mapped to the `routing_key_file` above, not in this repo. Recommended policy:

1. Page the primary on-call immediately for `severity: critical`.
2. Escalate to secondary on-call after 15 minutes without acknowledgement.
3. Escalate to the engineering manager after 30 minutes without acknowledgement.

`severity: warning` alerts are not paged; they are Slack-only and reviewed
during business hours.
