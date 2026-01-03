# Legal Knowledge Base (LKB) Architecture

## Overview

The LKB is the application's authoritative source for Swiss federal and Vaud cantonal legal texts. It enforces a **DB-first** approach where legal claims must be grounded in verified database entries before any external AI verification.

## Core Principles

### 1. DB-First Rule
- All legal citations must first be resolved against local database entries
- AI (Perplexity) is restricted to an **audit-only** role
- No claim is accepted as fact without DB backing
- New laws discovered by AI are flagged for ingestion, not immediate use

### 2. Version Integrity
- Each legal unit has `valid_from` and `valid_to` dates
- Queries for applicable law use the email/incident date
- SHA-256 content hashes detect unauthorized modifications

### 3. Audit Trail
- All verification steps are logged
- `verification_claims` tracks assertions to verify
- `verification_reports` stores Perplexity audit results

## Database Schema

```
legal_domains (12)
├── code: CONSTITUTION, EDUCATION, SOCIAL, SANTE, JUSTICE, etc.
├── label_fr: French display name
├── keywords: Search terms

legal_instruments (120+)
├── instrument_uid: Unique identifier (e.g., 'rsv-411.01')
├── title: Full legal title
├── abbreviation: Short form (e.g., 'LEO')
├── jurisdiction: CH | VD
├── current_status: in_force | repealed
├── domain_tags: Array of domain codes
├── replaced_by: UID of replacement if repealed

legal_versions
├── instrument_id: FK to legal_instruments
├── version_number: Sequential version
├── valid_from / valid_to: Applicability dates
├── source_document: Original source reference

legal_units (500+)
├── version_id: FK to legal_versions
├── instrument_id: FK to legal_instruments
├── cite_key: Article reference (e.g., 'art. 17')
├── unit_type: article | paragraph | letter
├── content_text: Full text content
├── hash_sha256: Content integrity hash
├── is_key_unit: Priority for retrieval

source_catalog
├── source_uid: rsv-vd, fedlex, etc.
├── source_url: Official source URL
├── last_scraped_at: Ingestion timestamp
```

## Pipeline Architecture

```
Email Received
     │
     ▼
┌─────────────────────┐
│ email-legal-detection │  ◄── Step 1: DB-only detection
└─────────────────────┘
     │
     ▼ email_legal_mentions
     │
┌─────────────────────┐
│    claim-builder     │  ◄── Step 2: Build verifiable claims
└─────────────────────┘
     │
     ▼ verification_claims (DB-backed)
     │
┌─────────────────────┐
│ perplexity-verifier  │  ◄── Step 3: External audit only
└─────────────────────┘
     │
     ▼ verification_reports
```

## Edge Functions

### email-legal-detection
- Parses email for legal citations using regex patterns
- Resolves abbreviations to `legal_instruments`
- Stores mentions in `email_legal_mentions`
- **No AI calls** - pure DB resolution

### claim-builder
- Takes resolved mentions and creates structured claims
- Each claim references a specific `legal_unit`
- Outputs to `verification_claims` table

### perplexity-verifier
- Receives DB-backed claims only
- Queries official sources (fedlex.admin.ch, rsv.vd.ch)
- Verifies claim accuracy against authoritative sources
- **Cannot create new facts** - only validates existing

### seed-complete-laws
- Populates LKB with seed data
- 12 domains, 120+ instruments, 500+ key articles
- Inline data to avoid external dependencies

## Ingestion Strategy

### Static Seed (Initial)
- Core domains with essential articles
- Federal laws: CC, CO, CP, CPC, CPP, LAMal, LAI, LPD
- Cantonal laws: LEO, LASV, LSP, LATC, LVPAE, etc.

### Dynamic Ingestion (legal-text-ingestion)
- Fetches from official catalogs
- Supports incremental updates
- Manages version transitions

## Verification Flow

1. **Detection**: Citation found in email → Check `legal_instruments`
2. **Resolution**: Find matching `legal_unit` by cite_key
3. **Claim Building**: Create structured claim with unit reference
4. **Verification**: Perplexity audits claim against official sources
5. **Reporting**: Store result with confidence score

## Security Considerations

- `legal_articles` table is read-only for authenticated users
- Write access restricted to admin role
- Content hashes prevent tampering
- Audit logs track all modifications

## Acceptance Criteria

| Test | Description | Validation |
|------|-------------|------------|
| A | Citation resolution without AI | DB lookup only |
| B | Version applicability by date | valid_from/valid_to check |
| C | Repealed instrument handling | replaced_by chain |
| D | Claims must be DB-backed | unit_id required |
| E | Content hash integrity | SHA-256 verification |

## Usage Examples

### Querying Applicable Law
```typescript
const { data } = await supabase
  .from('legal_units')
  .select('*, legal_versions!inner(*)')
  .eq('instrument_id', instrumentId)
  .lte('legal_versions.valid_from', referenceDate)
  .or(`legal_versions.valid_to.is.null,legal_versions.valid_to.gte.${referenceDate}`);
```

### Running Full Pipeline
```typescript
import { runFullLegalPipeline } from '@/services/lkbPipeline';

const result = await runFullLegalPipeline(emailId, {
  subject: email.subject,
  body: email.body,
  sender: email.sender,
  date: email.received_at,
});
```

## Monitoring

Key metrics to track:
- `legal_units` count (target: 500+)
- Resolution rate (citations resolved / total)
- Verification success rate
- Ingestion errors

## Future Enhancements

1. Semantic search with embeddings
2. Cross-reference detection between laws
3. Temporal analysis of legal changes
4. Multi-language support (FR/DE/IT)
