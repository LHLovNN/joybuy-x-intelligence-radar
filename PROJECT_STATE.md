# Project State

## Objective

Build a reusable Brand X Intelligence Radar MVP:

- Public-social monitoring for a configurable primary brand.
- Lightweight competitor baseline.
- Daily report with historical browsing.
- Static dashboard suitable for public demo or stakeholder review after data
  review.

## Public Positioning

This repository is packaged as a generic brand-opinion monitoring product. Public
files should describe the product capability, not the operator's real monitoring
configuration.

## Current Product Pages

- `舆情焦点`: prioritized opinion signals.
- `全部舆情`: complete date-based opinion stream.
- `舆情日报`: daily report with primary-brand and competitor sections.
- `设置`: public status, data quality and scoring methodology.

## Architecture Principles

- Public repo contains sample config and reviewed static dashboard data.
- Private config overrides live outside Git.
- Raw connector outputs, checkpoints, private logs and local notes remain
  ignored.
- Public dashboard JSON preserves evidence content but removes internal
  provider, budget, quota, deployment and secret-storage details.
- Correct architecture takes priority over convenience. If a required step needs
  user-side authorization or private setup, ask for that step instead of routing
  around it.

## Current Status

- Static dashboard shell is implemented.
- Historical daily archive browsing is implemented.
- Primary-brand focus, full opinion stream and daily report pages are aligned.
- Author hover cards, media rendering, Chinese/original switching and public
  metric display are implemented.
- Public pages and docs are being desensitized for public-repository use.

## Next

- Finish public desensitization QA.
- Verify the local dashboard visually.
- Commit and publish the sanitized version after user confirmation.
