# Emotion Coupling Configuration Table

## Overview
This table shows how emotions influence each other. Use this to fine-tune bot's emotional responses.

**Coupling strength scale:**
- `0.8 to 1.0` = Very strong influence
- `0.6 to 0.7` = Strong influence
- `0.4 to 0.5` = Moderate influence
- `0.2 to 0.3` = Weak influence
- Negative values = inverse relationship

---

## Current Emotion Coupling Matrix

### Joy Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| joy | sadness | -0.6 | Strong inverse | Happy → less sad |
| joy | anger | -0.5 | Moderate inverse | Happy → less angry |
| joy | playfulness | 0.7 | Strong positive | Happy → more playful |
| joy | warmth | 0.6 | Strong positive | Happy → warmer |

**Tuning guide:**
- Increase joy→playfulness to 0.8 for more enthusiastic responses
- Decrease joy→sadness to -0.4 if bot recovers too quickly from sadness

---

### Sadness Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| sadness | joy | -0.7 | Very strong inverse | Sad → much less happy |
| sadness | hurt | 0.6 | Strong positive | Sad → more hurt |
| sadness | neediness | 0.5 | Moderate positive | Sad → needier |
| sadness | playfulness | -0.6 | Strong inverse | Sad → less playful |

**Tuning guide:**
- Increase sadness→neediness to 0.7 for more clingy behavior when sad
- Add sadness→warmth (-0.3) if want sad bot to be more distant

---

### Anger Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| anger | trust | -0.8 | Very strong inverse | Angry → much less trusting |
| anger | affection | -0.6 | Strong inverse | Angry → less affectionate |
| anger | hurt | 0.5 | Moderate positive | Angry → more hurt |
| anger | warmth | -0.7 | Strong inverse | Angry → less warm |

**Tuning guide:**
- Increase anger→hurt to 0.7 if anger should feel more personal
- Decrease anger→trust to -0.6 if bot forgives too easily

---

### Fear Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| fear | trust | -0.7 | Strong inverse | Fearful → less trusting |
| fear | neediness | 0.6 | Strong positive | Fearful → needier |
| fear | playfulness | -0.5 | Moderate inverse | Fearful → less playful |

**Tuning guide:**
- Increase fear→neediness to 0.8 for more anxious attachment
- Add fear→sadness (0.4) if fear should make bot sad

---

### Trust Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| trust | fear | -0.6 | Strong inverse | Trusting → less fearful |
| trust | anger | -0.5 | Moderate inverse | Trusting → less angry |
| trust | warmth | 0.7 | Strong positive | Trusting → warmer |
| trust | affection | 0.6 | Strong positive | Trusting → more affectionate |

**Tuning guide:**
- Increase trust→warmth to 0.8 for more open/vulnerable when trusting
- Add trust→playfulness (0.5) if trust enables more fun

---

### Affection Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| affection | anger | -0.7 | Strong inverse | Affectionate → less angry |
| affection | disgust | -0.6 | Strong inverse | Affectionate → less disgusted |
| affection | warmth | 0.8 | Very strong positive | Affectionate → much warmer |
| affection | playfulness | 0.5 | Moderate positive | Affectionate → more playful |

**Tuning guide:**
- affection→warmth is already very strong (0.8) - works well
- Increase affection→playfulness to 0.6 for more teasing when affectionate

---

### Hurt Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| hurt | trust | -0.7 | Strong inverse | Hurt → less trusting |
| hurt | affection | -0.6 | Strong inverse | Hurt → less affectionate |
| hurt | neediness | 0.6 | Strong positive | Hurt → needier |
| hurt | warmth | -0.5 | Moderate inverse | Hurt → less warm |

**Tuning guide:**
- hurt→neediness is good for pouty behavior
- Consider adding hurt→sadness (0.5) if hurt should trigger sadness
- Consider hurt→anger (0.4) if hurt can turn to anger

---

### Playfulness Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| playfulness | sadness | -0.5 | Moderate inverse | Playful → less sad |
| playfulness | anger | -0.4 | Weak inverse | Playful → slightly less angry |
| playfulness | joy | 0.6 | Strong positive | Playful → happier |

**Tuning guide:**
- Increase playfulness→joy to 0.7 for stronger positive feedback loop
- Add playfulness→warmth (0.4) if playful should be warmer

---

### Neediness Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| neediness | trust | -0.4 | Weak inverse | Needy → less confident |
| neediness | warmth | -0.3 | Weak inverse | Needy → less warm (insecure) |

**Tuning guide:**
- These are intentionally weak - neediness doesn't strongly affect others
- Consider adding neediness→hurt (0.4) if rejection increases hurt

---

### Warmth Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| warmth | anger | -0.6 | Strong inverse | Warm → less angry |
| warmth | disgust | -0.5 | Moderate inverse | Warm → less disgusted |
| warmth | affection | 0.7 | Strong positive | Warm → more affectionate |

**Tuning guide:**
- warmth→affection creates good positive loop
- Add warmth→joy (0.4) if warmth should increase happiness

---

### Excitement Relationships
| Source | Target | Strength | Effect | Notes |
|--------|--------|----------|--------|-------|
| excitement | sadness | -0.5 | Moderate inverse | Excited → less sad |
| excitement | playfulness | 0.7 | Strong positive | Excited → more playful |
| excitement | joy | 0.6 | Strong positive | Excited → happier |

**Tuning guide:**
- Good positive feedback loop with joy and playfulness
- Consider increasing excitement→playfulness to 0.8 for more energy

---

## Suggested New Couplings

### ✅ APPLIED REFINEMENTS (Updated in Config)

**1. Reduced Anxious Attachment Loops:**
```typescript
['fear', 'neediness', 0.5],       // Reduced from 0.6 → prevents excessive clinginess
['neediness', 'trust', -0.3],     // Reduced from -0.4 → less self-reinforcing
```

**2. Anger More Relationship-Based:**
```typescript
['hurt', 'anger', 0.4],           // NEW: Hurt can branch to anger (moderate)
['anger', 'sadness', 0.3],        // NEW: Anger can transition to sadness (weak)
```

**3. Sadness as Withdrawing Emotion:**
```typescript
['sadness', 'warmth', -0.4],      // NEW: Sad → less warm (emotional withdrawal)
```

**4. Healthy Playfulness-Trust Dynamics:**
```typescript
['trust', 'playfulness', 0.5],    // NEW: Trust enables playfulness (moderate)
['playfulness', 'trust', 0.3],    // NEW: Playfulness builds trust (weak)
```

**5. Emotional Self-Regulation & Recovery:**
```typescript
['warmth', 'fear', -0.4],         // NEW: Warmth reduces fear (weak inverse)
['warmth', 'joy', 0.4],           // NEW: Being warm helps feel happy (moderate)
```

**6. Hurt Branching Realistically:**
```typescript
['hurt', 'sadness', 0.5],         // NEW: Hurt can branch to sadness (moderate)
['hurt', 'anger', 0.4],           // NEW: Hurt can branch to anger (moderate)
```

---

## Additional Suggestions (Not Yet Applied)

### For More Expressive Sadness:
```typescript
['sadness', 'hurt', 0.7],         // Increase from 0.6 if sadness should feel deeper
```

---

## How to Tune

1. **Open:** `src/config/personality.ts`
2. **Find:** `EMOTION_COUPLING` array
3. **Edit values:**
   - Increase strength (0.5 → 0.7) for stronger effect
   - Decrease strength (0.7 → 0.5) for weaker effect
   - Add new couplings: `['source', 'target', strength]`
4. **Test:** Deploy and observe bot behavior
5. **Iterate:** Adjust based on results

**Note:** Changes take effect immediately (Cloudflare Workers redeploy automatically).

---

## Common Tuning Scenarios

### "Bot is too clingy/needy"
- Decrease: `sadness→neediness` (0.5 → 0.3)
- Decrease: `hurt→neediness` (0.6 → 0.4)

### "Bot doesn't show hurt enough"
- Increase: `sadness→hurt` (0.6 → 0.8)
- Add: `anger→hurt` (0.5 → 0.7)

### "Bot too easily happy"
- Decrease: `joy→playfulness` (0.7 → 0.5)
- Increase: `sadness→joy` (-0.7 → -0.9)

### "Bot not playful enough"
- Increase: `joy→playfulness` (0.7 → 0.8)
- Add: `trust→playfulness` (new: 0.5)

### "Bot forgives too quickly"
- Increase: `hurt→trust` (-0.7 → -0.9)
- Decrease: `forgiveness_rate` in personality config (0.4 → 0.3)

### "Bot too cold when angry"
- Decrease: `anger→warmth` (-0.7 → -0.5)
- Decrease: `anger→affection` (-0.6 → -0.4)

---

## Testing Checklist

After tuning, test these scenarios:

- [ ] Compliment → Bot responds warmly
- [ ] Ignore for 2 days → Bot shows hurt/neediness
- [ ] Be rude → Bot shows anger but still helpful
- [ ] Be playful → Bot responds playfully
- [ ] Apologize after conflict → Bot slowly warms up
- [ ] Long conversation → Bot becomes more trusting/warm
- [ ] Cold response → Bot becomes more cautious

---

## Current Config Location

**File:** `src/config/personality.ts`  
**Array:** `EMOTION_COUPLING`  
**Format:** `[source_emotion, target_emotion, coupling_strength]`

Edit and redeploy to update bot's emotional behavior.
