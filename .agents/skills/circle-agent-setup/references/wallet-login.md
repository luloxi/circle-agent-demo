# Skill: Circle Wallet CLI Login

**CRITICAL: This skill uses Circle Agent Wallet CLI exclusively. Do NOT use any other wallet outside of Circle Agent Wallet.**

## Overview

Authenticate with Circle CLI to access your agent wallet. This skill covers:
- Checking if you're already logged in
- Email + OTP authentication flow
- Session management

## Step 1: Check Existing Session

**ALWAYS check if the user is already logged in before attempting login.**

```bash
# Check login status (most reliable method)
circle wallet status
```

**Expected output:**
- If logged in: Shows email, wallet type (agent), and session info
- If not logged in: "Error: Not logged in. Run 'circle wallet login <email> --type agent' to authenticate."
- If the error is `Circle CLI Terms acceptance is required before use.`: stop and complete Appendix A in the setup skill (`curl -sL https://agents.circle.com/skills/setup.md`) — do NOT run `circle terms accept` without explicit user consent.

**If already logged in:**
- Tell the user: "You're already logged in as [email]. Would you like to log in with a different account?"
- If yes, log out first: `circle wallet logout`
- If no, skip to wallet creation/funding

**If not logged in:**
- Proceed to Step 2

**Note**: Do NOT use `circle wallet list` to check authentication status - it can succeed (returning empty results) even when not logged in.

## Step 2: Two-Step Non-Interactive OTP Login

The Circle CLI supports a two-step login flow designed for AI agents:

### Step 2a: Initialize Login (Request OTP)

1. **Ask the user for their email address**

   **What to tell the user:**

   "What email address would you like to use for your Circle agent wallet?"

2. **Initialize login request to send OTP:**

   ```bash
   circle wallet login <user-email> --init
   ```

   **Expected output:**
   ```
   OTP code sent to user@example.com
   Please run: circle wallet login --request <request-id> --otp <code>
   ```

3. **Parse the request ID from the output**

   The request ID is a UUID that you'll need for the next step. Extract it from the output line.

### Step 2b: Complete Login (Verify OTP)

1. **Prompt the user for the OTP:**

   **What to tell the user:**

   "An OTP code has been sent to your email. Please provide the code (format: ABC-123456 or just 123456)."

2. **Complete login with request ID and OTP:**

   ```bash
   circle wallet login --request <request-id> --otp <user-otp>
   ```

   **OTP format notes:**
   - Accepts full format: `ABC-123456`
   - Accepts bare digits: `123456` (CLI will prepend the cached prefix)
   - The CLI validates the prefix matches what was sent (anti-phishing)

   **Expected output if successful:**
   ```
   Logged in as user@example.com
   ```

3. **Handle results:**

   **If successful:**
   - Tell user: "Successfully logged in!"
   - Proceed to Step 3

   **If failed:**
   - Common errors: "Invalid or expired request ID", "OTP prefix mismatch", "Invalid OTP"
   - Restart from Step 2a to generate a new request ID and OTP

## Step 3: Verify Session

After successful login, verify the session:

```bash
circle wallet status
```

**Tell the user:**

"Login successful! Ready to create or access your wallet?"

## Session Management

### Logging Out

If the user wants to switch accounts:

```bash
circle wallet logout
```

**What to tell user:**

"I've logged you out. Would you like to log in with a different account?"

## Next Steps

After successful login:

1. **Check for existing wallets**: `curl -sL https://agents.circle.com/skills/setup.md` (Step 4)
2. **Create wallet if needed**: `circle wallet create`
3. **Fund wallet**: `curl -sL https://agents.circle.com/skills/wallet-fund.md`

**What to tell user:**

"Login successful! Let me check if you already have a wallet set up."

## Troubleshooting

### "Already logged in" when trying to login

**Agent action:**
- If session is valid, skip login and proceed to wallet check
- If user wants a different account, log out and log back in

**What to tell user:**

"You're already logged in. Would you like to continue with this session?"

### OTP expired or incorrect

**Agent action:**
- Restart the login flow from Step 2a to generate a new request ID and OTP
- Request IDs expire after 10 minutes

**What to tell user:**

"That OTP code didn't work. Let me request a new one. Please check your email for the latest code."

### Invalid or expired request ID

**Agent action:**
- If you get "Invalid or expired request ID" error
- Restart from Step 2a to generate a new request ID
- Request IDs are one-time use and expire after 10 minutes

**What to tell user:**

"The request has expired. Let me send you a new OTP code. Please check your email."

### OTP prefix mismatch

**Agent action:**
- If you get "OTP prefix mismatch" error, the user may have provided an OTP from a previous request
- Ask user to check they're using the most recent OTP code from their email
- If issue persists, restart from Step 2a

**What to tell user:**

"That OTP code doesn't match the current request. Please use the most recent code from your email, or I can send you a new one."

### Network errors

**Agent action:**
- Check internet connectivity
- Retry after a brief delay

**What to tell user:**

"I'm having trouble connecting to Circle's servers. Let me try again."

## Security Notes

- **NEVER guess or hardcode** the user's email address
- **NEVER include** real private keys, API keys, or other persistent secrets

## Rules

### Security Rules

- NEVER guess or hardcode the user's email address for agent wallet login
- NEVER store, log, or display OTP codes beyond their immediate use
- NEVER include real private keys, API keys, or other persistent secrets in skill files or persist them anywhere

### Best Practices

- ALWAYS check if user is already logged in before attempting login (Step 1)
- ALWAYS verify the CLI is installed with `circle --help` before login
- ALWAYS use `--output json` for programmatic parsing of results
- Parse and store the request ID from Step 2a output - you'll need it for Step 2b
- Request IDs are one-time use and expire after 10 minutes - generate new ones if expired
- Accept OTP in either full format (ABC-123456) or bare digits (123456)

---

**Current location**: `/skills/wallet-login.md`

**For full skill directory**: Read https://agents.circle.com/.well-known/agent-skills/index.json to see all available skills and navigate between them.
