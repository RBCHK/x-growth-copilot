# Clerk + Playwright E2E Testing

## Problem: `clerk.signIn()` from `@clerk/testing` doesn't work with Clerk v7

The programmatic `clerk.signIn({ strategy: "password" })` silently fails — the sign-in form stays empty.

## Solution: UI-based sign-in + test emails

1. Fill email/password through the actual form using Playwright locators
2. Use `+clerk_test` email suffix (e.g., `e2e+clerk_test@postimi.com`)
3. When device verification (factor-two) appears, type code `424242` via keyboard
4. Clerk auto-submits OTP — no need to click Continue after entering code

## Test user setup

Create via Clerk Backend API with `skip_password_checks: true`:

```bash
curl -X POST "https://api.clerk.com/v1/users" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -d '{"email_address":["e2e+clerk_test@postimi.com"],"password":"unique-pass","skip_password_checks":true}'
```

## Key gotchas

- `clerkSetup()` must still be called in global setup (enables testing mode)
- Button selector: use `{ name: "Continue", exact: true }` — "Continue with Google" also matches `/continue/i`
- Radix hydration warnings (`aria-controls` ID mismatch) are false positives — filter them out
