# NPM 7-Day Cooling Period Policy — btcfi

## Purpose
Defense against supply chain attacks like axios 1.7.4/1.7.5/1.7.8 compromises.
Malicious packages are often published and discovered within days.

## Policy (Mandatory)

**NEVER install npm packages released within 7 days.**

This applies to:
- New dependencies
- Version updates
- Security patches (verify via alternate channel first)

## How to Check Package Age

```bash
# Check when a package was published
npm view <package>@<version> time

# Example - GOOD (safe to install, >7 days old)
npm view axios@1.13.5 time
# 2026-02-08T11:05:13.696Z (published Feb 8, today is Apr 9 = 60 days ✓)

# Example - BAD (wait! <7 days old)
npm view axios@1.15.0 time  
# 2026-04-08T16:09:38.623Z (published yesterday - WAIT 6 MORE DAYS)
```

## Layer 2: NPQ Protection (Active)

npq (installed globally) intercepts npm commands and checks:
- Known vulnerabilities (Snyk DB)
- Suspicious package patterns
- Typo-squatting detection
- Registry verification

**Alias set:** `npm` → `npq-hero`

```bash
# Now when you install, npq guards it:
npm install axios
# npq checks: ✓ Package found in npm registry
#           ✓ No known vulnerabilities  
#           ✓ Repository age: 8 years
#           ✓ Weekly downloads: 50M
# Proceeding with install...
```

## Emergency Bypass (Not Recommended)

If urgent security patch <7 days old:

```bash
# Method 1: Use direct npm (bypass npq)
\npm install <package>@<version>  # note the backslash

# Method 2: Manually verify first
npm view <package>@<version>  # Check publisher, repository, README
# Only proceed if you trust the source
```

⚠️ **All bypasses are logged in your shell history. Use only for verified security patches.**

## Pre-Install Checklist

Before any `npm install`:

- [ ] Check package age with `npm view <pkg>@<ver> time`
- [ ] Verify >7 days old OR emergency verified
- [ ] Review `npm audit` output
- [ ] Check that npq guard is active (you'll see npq output)

## Current Protection Layers

| Layer | Status | Mechanism |
|-------|--------|-----------|
| 7-day cooldown | ⚠️ Manual | Policy enforcement (npm bug prevents auto) |
| npq guard | ✅ Active | `npm` aliased to `npq-hero` |
| Lockfile validation | ✅ Active | `package-lock=true`, `save-exact=true` |
| Secrets monitoring | ✅ Active | Simulation G34 Sentinel |

## Incident Response

If a supply chain attack is discovered:

1. **Immediate:** Check if btcfi uses affected package
   ```bash
   npm ls <package>
   grep -r "<package>" package.json package-lock.json
   ```

2. **If affected:**
   - Remove compromised version immediately
   - Rotate any potentially exposed secrets
   - Review network logs for exfiltration
   - Check IOCs (C2 domains, dropped files)

3. **Document:** Add to security log with IOCs for team awareness

## Verification

Test your setup:
```bash
# 1. Verify npq active
which npm  # Should show npq-hero path

# 2. Test on safe package (should pass)
npm install axios@1.13.5 --dry-run 2>&1 | head -10

# 3. Check policy file exists
ls -la ~/btcfi-api/NPM-SUPPLY-CHAIN-POLICY.md
```

## Questions?

Contact: security process via simulation sentinel
