# Private Connector Setup

This public document intentionally avoids naming internal providers, model
names, account paths or secret keys.

## Principle

The MVP supports real-data operation through maintainer-approved connectors and
language-processing services. Credentials and real connector configuration must
stay outside the public repository.

## Required Private Inputs

Maintainers should prepare these items in a private environment:

- A public-social-data connector credential.
- A language-processing credential for Chinese translation.
- A private monitoring dictionary for the primary brand.
- A private competitor baseline dictionary.
- Optional verification or executive-analysis connectors.

## Local Override Files

Place private configuration in the ignored override directory:

```text
config/private/
```

The application loads private overrides first. If the override directory is
absent, it falls back to the sample configuration tracked in `config/`.

## Safety Checklist

- Do not paste credentials into Markdown, JSON, screenshots or committed logs.
- Do not add private connector credentials to public CI settings.
- Do not commit raw connector payloads or private checkpoints.
- Review public dashboard JSON before publishing.
- Keep public docs generic: no provider names, exact keyword dictionaries,
  budget numbers, quota numbers or internal deployment details.

## Operational Flow

1. Store credentials in an approved secret manager.
2. Add private config overrides locally.
3. Run a non-publishing preview.
4. Review generated public dashboard output.
5. Publish only reviewed static dashboard artifacts.
