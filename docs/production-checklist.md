# Production Readiness Checklist

## Pre-Production Validation

### Database State

- [ ] `legal_domains` >= 12 entries
- [ ] `legal_instruments` >= 120 entries
- [ ] `legal_units` >= 500 entries
- [ ] `source_catalog` has official sources configured
- [ ] All instruments have valid `domain_tags`

### Security

- [ ] RLS enabled on all user-data tables
- [ ] `gmail_config` tokens encrypted (AES-GCM)
- [ ] Audit tables are immutable (no UPDATE/DELETE)
- [ ] Admin-only tables properly restricted
- [ ] No exposed API keys in code

### Authentication

- [ ] Auto-confirm email enabled for development
- [ ] No anonymous sign-ups allowed
- [ ] Profile creation trigger active

### Edge Functions

- [ ] All functions deployed successfully
- [ ] Required secrets configured:
  - LOVABLE_API_KEY
  - PERPLEXITY_API_KEY
  - GMAIL_TOKEN_ENCRYPTION_KEY
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
- [ ] CORS headers configured correctly
- [ ] Error handling with proper logging

### Legal Pipeline

- [ ] `email-legal-detection` resolves citations to DB
- [ ] `claim-builder` creates DB-backed claims
- [ ] `perplexity-verifier` audits claims correctly
- [ ] `auto-process-email` calls legal detection

### Frontend

- [ ] All routes accessible via navigation
- [ ] `/legal-config` in sidebar
- [ ] `/legal-admin` in sidebar
- [ ] LKB stats display correctly
- [ ] No TypeScript errors
- [ ] No console errors in production build

### Tests

- [ ] Unit tests pass: `npm run test`
- [ ] LKB acceptance tests (A-E) pass
- [ ] E2E: Email → Incident workflow
- [ ] E2E: Legal pipeline detection

## Verification Commands

```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Run tests
npm run test

# Check dependencies
npm audit
```

## Database Verification Queries

```sql
-- Domain count
SELECT COUNT(*) FROM legal_domains; -- >= 12

-- Instrument count
SELECT COUNT(*) FROM legal_instruments; -- >= 120

-- Unit count
SELECT COUNT(*) FROM legal_units; -- >= 500

-- Key units
SELECT COUNT(*) FROM legal_units WHERE is_key_unit = true;

-- Source catalog
SELECT * FROM source_catalog;

-- RLS verification
SELECT tablename, policies 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Post-Deployment Verification

1. Create test user account
2. Configure Gmail OAuth
3. Sync emails
4. Verify email analysis includes legal mentions
5. Check incident creation with legal references
6. Export PDF with legal verification badge

## Rollback Plan

If issues are detected:

1. Revert to previous git commit
2. Database rollback is NOT automatic
3. Contact admin for migration reversal if needed

## Monitoring

Key metrics to watch:

- Edge function invocation errors
- Database query latency
- Authentication failures
- Legal resolution rate

## Support Contacts

- Technical Issues: Check edge function logs
- Database Issues: Review Supabase dashboard
- Authentication: Verify OAuth configuration
