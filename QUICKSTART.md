# Quick Start: Upload API Keys

## 1. Edit Keys

Open `scripts/upload-keys.ts` and update:

```typescript
const API_KEYS = [
  {
    keyName: 'primary',
    apiKey: 'AIzaSyAGzJXSlDfVlQHvjNkzVX-9lGb7LLMM_oE',  // ← Your key here
    rpmLimit: 5,
    rpdLimit: 20,
    isActive: true
  },
  {
    keyName: 'key_1',
    apiKey: 'AIzaSyDlQzNZWMaKiLIl7QvYq7C8SnYA_VtfhDw',  // ← Add more keys
    rpmLimit: 5,
    rpdLimit: 20,
    isActive: true
  },
];
```

## 2. Run Upload

```bash
npm run upload-keys
```

## 3. Verify

```bash
psql $NEON_DATABASE_URL -c "SELECT key_name, rpm_limit, rpd_limit, is_active FROM api_keys;"
```

Done! Bot sẽ tự động dùng keys này.

---

## Viewing Logs

### Local Development
```bash
npm run dev
# Logs appear in terminal
```

### Production
```bash
wrangler tail
# Real-time logs from Cloudflare
```

### Filter Logs
```bash
# Tool calls only
wrangler tail | grep "🔧"

# AI responses only  
wrangler tail | grep "=== AI RESPONSE ==="

# Errors only
wrangler tail | grep "❌"
```

See [LOGGING.md](LOGGING.md) for detailed examples.
