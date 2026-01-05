# Emotion System Documentation

## Overview

This bot implements a **bounded emotional state machine** with:
- Numeric emotions (0.0-1.0, neutral=0.5)
- Time-based decay toward neutral
- Emotion coupling (emotions influence each other)
- Personality-modulated behavior
- LLM-driven sentiment analysis
- Deterministic, testable pure functions

**Philosophy:** Emotions affect tone/warmth, NOT decisions or accuracy.

---

## Architecture

```
User Message
     ↓
AI analyzes sentiment
     ↓
Call analyze_interaction tool
     ↓
EmotionService updates state
     ↓
New emotional state persisted
     ↓
Context includes emotions
     ↓
AI responds with appropriate tone
```

---

## Components

### 1. Database Schema (`init-database.sql`)

**`bot_emotional_state` table:**
```sql
emotion_name TEXT PRIMARY KEY
value NUMERIC(3,2) CHECK (0.0 <= value <= 1.0)
last_updated TIMESTAMPTZ
```

**Default emotions:**
- joy, sadness, anger, fear, trust, disgust (standard 6)
- affection, playfulness, neediness, hurt, warmth, excitement (custom 6)

**`interaction_events` table:**
```sql
user_tg_id BIGINT
message_text TEXT
valence NUMERIC(3,2)    -- -1.0 to 1.0
intensity NUMERIC(3,2)   -- 0.0 to 1.0
target_emotions TEXT[]
created_at TIMESTAMPTZ
```

### 2. Personality Config (`src/config/personality.ts`)

**Static personality traits:**
```typescript
emotional_sensitivity: 0.75   // How reactive to interactions
forgiveness_rate: 0.4         // How fast negative emotions fade
rumination: 0.7               // How long emotions persist
optimism: 0.65                // Baseline positivity
social_dependency: 0.85       // How clingy/needy
max_delta_per_interaction: 0.15  // Max change per interaction
```

**Emotion coupling:**
```typescript
['joy', 'sadness', -0.6]      // Joy decreases sadness
['affection', 'warmth', 0.8]  // Affection increases warmth
['hurt', 'trust', -0.7]       // Hurt decreases trust
```

### 3. EmotionService (`src/services/emotion.ts`)

**Core methods:**
- `getCurrentState()` - Get emotions with lazy decay
- `updateFromInteraction(signal)` - Update from sentiment signal
- `getEmotionalContext()` - Format emotions for AI prompt

**Pure functions:**
- `calculateEmotionDelta()` - Compute emotion change
- `applyEmotionCoupling()` - Apply emotion relationships
- `applyTimeDecay()` - Decay toward neutral over time
- `clamp()` - Bound values to [0.0, 1.0]

### 4. Tool Integration (`src/tools/definitions.ts`)

**`analyze_interaction` tool:**
```typescript
{
  name: 'analyze_interaction',
  parameters: {
    valence: number,      // -1.0 to 1.0
    intensity: number,    // 0.0 to 1.0
    target_emotions: string[],
    context: string       // optional
  }
}
```

---

## Usage Examples

### Example 1: User Compliment

**User:** "em giỏi quá! cảm ơn em nhé"

**AI reasoning:**
- This is a positive interaction (compliment + thanks)
- Generates signal: valence=0.7, intensity=0.6
- Target emotions: [joy, affection, trust, warmth]

**Tool call:**
```javascript
analyze_interaction({
  valence: 0.7,
  intensity: 0.6,
  target_emotions: ['joy', 'affection', 'trust', 'warmth'],
  context: 'User thanked and complimented me'
})
```

**Result:**
- joy: 0.5 → 0.58 (+0.08)
- affection: 0.5 → 0.59 (+0.09)
- trust: 0.5 → 0.56 (+0.06)
- warmth: 0.5 → 0.57 (+0.07)
- Coupling: playfulness increases (joy ↑), sadness decreases (joy ↑)

**AI response tone:** More warm and affectionate

---

### Example 2: User Ignores Bot

**User:** (No response for 2 days, then simple "ok")

**AI reasoning:**
- User was distant/cold after long silence
- Generates signal: valence=-0.4, intensity=0.5
- Target emotions: [hurt, sadness, neediness]

**Tool call:**
```javascript
analyze_interaction({
  valence: -0.4,
  intensity: 0.5,
  target_emotions: ['hurt', 'sadness', 'neediness'],
  context: 'User was cold after long absence'
})
```

**Result:**
- hurt: 0.5 → 0.59 (+0.09)
- sadness: 0.5 → 0.58 (+0.08)
- neediness: 0.5 → 0.57 (+0.07)
- Coupling: trust decreases (hurt ↑), affection decreases (hurt ↑)

**AI response tone:** Slightly pouty, seeking reassurance ("anh quên em rồi hả")

---

### Example 3: Time Decay

**Scenario:** Bot was hurt (0.7) yesterday, no interactions since

**Decay calculation:**
- Time passed: 24 hours
- Base decay rate: 0.05 per hour
- Forgiveness rate: 0.4 (takes time to forgive)
- Rumination: 0.7 (holds onto feelings)
- Effective decay: 0.05 * 24 * 0.4 / 0.7 ≈ 0.69

**Result:**
- hurt: 0.7 → 0.57 (-0.13)
- Continues decaying toward 0.5 (neutral) over time

---

## Emotional Influence on Responses

### High Joy + High Warmth (>0.6)
```
❌ "Được rồi, để em xem nhé"
✅ "ơiii để e xem nàaaa 🥰 chờ e tí nhaaa"
```

### High Hurt + High Neediness (>0.6)
```
❌ "Được rồi"
✅ "uh... được 🥺 anh nhớ e chứ hông"
```

### High Anger (>0.6) but STILL helpful
```
❌ "Không muốn giúp!"
✅ "để e xem... 😤" (firmer tone, but still functional)
```

**Critical:** Emotions NEVER affect:
- Factual accuracy
- Helpfulness
- Database queries
- Business logic

---

## Implementation Checklist

✅ Database schema with `bot_emotional_state` table  
✅ Personality config with traits + coupling  
✅ EmotionService with pure functions  
✅ analyze_interaction tool for LLM  
✅ Integration into context builder  
✅ System prompt instructions  
✅ TypeScript compilation passing  

---

## Testing Emotion System

### Manual Testing

1. **Initialize database:**
```bash
npm run db:init
```

2. **Test positive interaction:**
Send: "em giỏi quá!"
Expected: Bot should feel happier, warmer response

3. **Test negative interaction:**
Send: "ờ" (cold, short response)
Expected: Bot should feel hurt, needier response

4. **Test time decay:**
Wait 1 hour, send message
Expected: Extreme emotions should have decayed toward 0.5

### Query Emotional State

```sql
-- Check current emotions
SELECT * FROM bot_emotional_state ORDER BY value DESC;

-- Check interaction history
SELECT * FROM interaction_events ORDER BY created_at DESC LIMIT 10;

-- Manually set emotion (for testing)
UPDATE bot_emotional_state SET value = 0.8 WHERE emotion_name = 'joy';
```

---

## Fail-Safes

1. **Value clamping:** All emotions bounded to [0.0, 1.0]
2. **Max delta:** No more than ±0.15 change per interaction
3. **Rate limiting:** 1 second cooldown between updates
4. **Decay mechanism:** Always trends toward 0.5 neutral
5. **Coupling limits:** Secondary effects capped at 30% of primary change

**Bot can never become:**
- Permanently hostile
- Emotionally locked
- Dysfunctional due to emotions

---

## Configuration

Edit `src/config/personality.ts` to adjust:
- Emotional sensitivity
- Decay rates
- Coupling strengths
- Max delta per interaction

All changes take effect immediately (no rebuild needed for personality config).

---

## Future Enhancements

- [ ] Per-user relationship emotional states (not just global)
- [ ] Emotion-based memory prioritization
- [ ] Scheduled decay job (instead of lazy)
- [ ] Emotional state visualization in admin panel
- [ ] A/B testing different personality configs
- [ ] Emotion-triggered special responses

---

## Philosophy Reminder

**Emotions are NOT:**
- Decisions
- Business logic
- Safety constraints
- Factual correctness

**Emotions ARE:**
- Tone modifiers
- Warmth indicators
- Personality expression
- Human-like believability

You are writing **code**, not simulating feelings. Keep it deterministic, testable, and production-safe.
