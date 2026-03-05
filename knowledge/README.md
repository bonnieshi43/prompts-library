# Knowledge Base Documentation

## Overview

This directory contains structured knowledge documentation extracted from product documentation, organized by product, domain, and module. Each documentation file serves as a knowledge base entry for AI search and retrieval systems.

## Metadata Requirement

**Every Markdown file in this knowledge base MUST include a YAML front-matter metadata block at the beginning of the file.**

### Required Metadata Structure

Each `.md` file must start with the following metadata structure:

```yaml
---
product: StyleBI
domain: dashboard
module: filter
components:
  - selection-list
  - selection-tree
  - selection-container
type: dashboard-design-filter
tags:
  - selection
  - filter
source: https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/UseFilterComponents.html
---
```

### Metadata Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `product` | Yes | Product name | `StyleBI` |
| `domain` | Yes | Domain/area (e.g., dashboard, platform, data) | `dashboard` |
| `module` | Yes | Module or feature name | `filter` |
| `components` | Yes | List of components/features covered | `- selection-list`<br>`- selection-tree` |
| `type` | Yes | Type classification (e.g., dashboard-design-filter, data-preparation, system-setting) | `dashboard-design-filter` |
| `tags` | Yes | Searchable keywords/tags | `- selection`<br>`- filter` |
| `source` | Yes | Source documentation reference (full URL) | `https://www.inetsoft.com/docs/stylebi/...` |

### Metadata Guidelines

1. **Product**: Use consistent product naming (e.g., `StyleBI`)
2. **Domain**: Reflects the product area (dashboard, platform, data preparation, etc.)
3. **Module**: Specific module or feature within the domain
4. **Components**: List all components/features documented in the file
5. **Type**: Classification based on product workflow:
   - `dashboard-design-filter`: Dashboard design/display layer filtering
   - `dashboard-design-chart`: Dashboard design/display layer charts
   - `data-preparation`: Data preparation layer
   - `system-setting`: Platform/system settings
   - Add more types as needed
6. **Tags**: Include relevant keywords for searchability (synonyms, related terms)
7. **Source**: Reference to original documentation source

## Directory Structure

```
knowledge/
├── inetsoft/                  # Product vendor/organization
│   └── modules/               # Organized by modules
│       └── dashboard/         # Domain: dashboard
│           └── *.md           # Module-specific documentation
└── README.md                  # This file
```

## File Naming Convention

- Use descriptive, kebab-case names
- Include product prefix when applicable: `stylebi-{domain}-{module}.md`
- Example: `stylebi-dashboard-filter-selection.md`

## Validation

Before committing new documentation files:

1. ✅ Verify metadata block exists at the top of the file
2. ✅ Ensure all required fields are present
3. ✅ Check that metadata is valid YAML syntax
4. ✅ Confirm `components` and `tags` are arrays (using `-` list syntax)
5. ✅ Validate that `type` follows the classification system

## Purpose

This metadata structure enables:

- **AI Search**: Semantic search and retrieval based on product, domain, module, and tags
- **Classification**: Automatic categorization and filtering
- **Traceability**: Link back to source documentation
- **Multi-language Support**: Language-aware search and filtering
- **Component Discovery**: Find documentation by component/feature name

## Example

See `inetsoft/modules/dashboard/stylebi-dashboard-filter-selection.md` for a complete example of a properly formatted knowledge base document with metadata.
