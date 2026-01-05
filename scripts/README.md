# Upload API Keys Script

## Usage

```bash
npm run upload-keys
```

## Configuration

Edit `scripts/upload-keys.ts` and modify the `API_KEYS` array:

```typescript
const API_KEYS = [
  {
    keyName: 'primary',
    apiKey: 'AIzaSy...',  // Your Gemini API key
    rpmLimit: 5,          // Requests per minute
    rpdLimit: 20,         // Requests per day
    isActive: true
  },
  {
    keyName: 'backup',
    apiKey: 'AIzaSy...',
    rpmLimit: 5,
    rpdLimit: 20,
    isActive: true
  },
  // Add more keys...
];
```

## Features

- ✅ Checks if table exists
- ✅ Skips existing keys (safe to re-run)
- ✅ Shows detailed progress
- ✅ Displays summary table
- ✅ Auto-loads `.dev.vars`

## Example Output

```
🔑 [Upload Keys] Starting...
📊 [Upload Keys] Found 2 key(s) to upload

🔍 [Upload Keys] Checking if api_keys table exists...
✅ [Upload Keys] Table api_keys exists

📤 [Upload Keys] Processing: primary
✅ [Upload Keys] Inserted "primary" (ID: 1)
   - RPM Limit: 5
   - RPD Limit: 20
   - Active: true

📤 [Upload Keys] Processing: backup
⏭️  [Upload Keys] Key "backup" already exists (ID: 2), skipping...

========================================
📊 [Upload Keys] Summary:
   ✅ Inserted: 1
   ⏭️  Skipped:  1
   ❌ Errors:   0
========================================

📋 [Upload Keys] Current keys in database:
┌─────┬─────────┬──────┬──────┬────────┬─────────┬───────────┐
│ ID  │ Name    │ RPM  │ RPD  │ Active │ Blocked │ Created   │
├─────┼─────────┼──────┼──────┼────────┼─────────┼───────────┤
│ 1   │ primary │ 0/5  │ 0/20 │ ✅     │ ✅      │ 1/5/2026  │
│ 2   │ backup  │ 0/5  │ 0/20 │ ✅     │ ✅      │ 1/5/2026  │
└─────┴─────────┴──────┴──────┴────────┴─────────┴───────────┘

✅ [Upload Keys] Done!
```
