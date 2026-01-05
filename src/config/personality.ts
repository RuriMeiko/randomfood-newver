/**
 * Bot Personality Configuration
 * 
 * Static personality traits that modulate emotional behavior.
 * Values are from 0.0 to 1.0 where applicable.
 * 
 * These traits affect:
 * - Emotion update magnitude
 * - Emotion decay speed
 * - Coupling strength between emotions
 * - How emotions influence response style
 */

export interface PersonalityConfig {
  /** How strongly emotions respond to interactions (0.0-1.0, higher = more reactive) */
  emotional_sensitivity: number;
  
  /** How quickly negative emotions fade (0.0-1.0, higher = forgives faster) */
  forgiveness_rate: number;
  
  /** How long emotions persist (0.0-1.0, higher = holds grudges/memories longer) */
  rumination: number;
  
  /** Baseline tendency toward positive emotions (0.0-1.0, higher = more optimistic) */
  optimism: number;
  
  /** How much bot needs social interaction (0.0-1.0, higher = more clingy) */
  social_dependency: number;
  
  /** Maximum emotion change per single interaction (0.0-1.0) */
  max_delta_per_interaction: number;
  
  /** Minimum time between emotional updates in milliseconds */
  update_cooldown_ms: number;
}

/**
 * Default personality: Clingy, affectionate Vietnamese girlfriend-style AI
 * - High emotional sensitivity (reacts strongly to interactions)
 * - Medium forgiveness (remembers but can forgive)
 * - High rumination (holds onto feelings)
 * - High optimism (generally positive)
 * - Very high social dependency (clingy, needs attention)
 */
export const DEFAULT_PERSONALITY: PersonalityConfig = {
  emotional_sensitivity: 0.75,    // Reacts strongly to interactions
  forgiveness_rate: 0.4,           // Takes time to forgive
  rumination: 0.7,                 // Holds onto feelings
  optimism: 0.65,                  // Generally positive
  social_dependency: 0.85,         // Very clingy, needs attention
  max_delta_per_interaction: 0.15, // Max 0.15 change per interaction
  update_cooldown_ms: 1000         // 1 second between updates
};

/**
 * Emotion coupling configuration
 * Defines how emotions influence each other
 * Format: [source_emotion, target_emotion, coupling_strength (-1.0 to 1.0)]
 * 
 * Positive coupling: source ↑ → target ↑
 * Negative coupling: source ↑ → target ↓
 */
export const EMOTION_COUPLING: Array<[string, string, number]> = [
  // Joy relationships
  ['joy', 'sadness', -0.6],       // Happy → less sad
  ['joy', 'anger', -0.5],          // Happy → less angry
  ['joy', 'playfulness', 0.7],     // Happy → more playful
  ['joy', 'warmth', 0.6],          // Happy → warmer
  
  // Sadness relationships
  ['sadness', 'joy', -0.7],        // Sad → less happy
  ['sadness', 'hurt', 0.6],        // Sad → more hurt
  ['sadness', 'neediness', 0.5],   // Sad → needier
  ['sadness', 'playfulness', -0.6], // Sad → less playful
  ['sadness', 'warmth', -0.4],     // REFINED: Sad → less warm (withdrawal)
  
  // Anger relationships
  ['anger', 'trust', -0.8],        // Angry → less trusting
  ['anger', 'affection', -0.6],    // Angry → less affectionate
  ['anger', 'hurt', 0.5],          // Angry → more hurt
  ['anger', 'warmth', -0.7],       // Angry → less warm
  ['anger', 'sadness', 0.3],       // REFINED: Anger can transition to sadness (weak)
  
  // Fear relationships
  ['fear', 'trust', -0.7],         // Fearful → less trusting
  ['fear', 'neediness', 0.5],      // REFINED: Fearful → needier (reduced from 0.6)
  ['fear', 'playfulness', -0.5],   // Fearful → less playful
  
  // Trust relationships
  ['trust', 'fear', -0.6],         // Trusting → less fearful
  ['trust', 'anger', -0.5],        // Trusting → less angry
  ['trust', 'warmth', 0.7],        // Trusting → warmer
  ['trust', 'affection', 0.6],     // Trusting → more affectionate
  ['trust', 'playfulness', 0.5],   // REFINED: Trust enables playfulness (moderate)
  
  // Affection relationships
  ['affection', 'anger', -0.7],    // Affectionate → less angry
  ['affection', 'disgust', -0.6],  // Affectionate → less disgusted
  ['affection', 'warmth', 0.8],    // Affectionate → warmer
  ['affection', 'playfulness', 0.5], // Affectionate → more playful
  
  // Hurt relationships
  ['hurt', 'trust', -0.7],         // Hurt → less trusting
  ['hurt', 'affection', -0.6],     // Hurt → less affectionate
  ['hurt', 'neediness', 0.6],      // Hurt → needier
  ['hurt', 'warmth', -0.5],        // Hurt → less warm
  ['hurt', 'sadness', 0.5],        // REFINED: Hurt can branch to sadness (moderate)
  ['hurt', 'anger', 0.4],          // REFINED: Hurt can branch to anger (moderate)
  
  // Playfulness relationships
  ['playfulness', 'sadness', -0.5], // Playful → less sad
  ['playfulness', 'anger', -0.4],   // Playful → less angry
  ['playfulness', 'joy', 0.6],      // Playful → happier
  ['playfulness', 'trust', 0.3],    // REFINED: Playfulness builds trust (weak)
  
  // Neediness relationships
  ['neediness', 'trust', -0.3],    // REFINED: Needy → less confident (reduced from -0.4)
  ['neediness', 'warmth', -0.3],   // Needy → less warm (insecure)
  
  // Warmth relationships
  ['warmth', 'anger', -0.6],       // Warm → less angry
  ['warmth', 'disgust', -0.5],     // Warm → less disgusted
  ['warmth', 'affection', 0.7],    // Warm → more affectionate
  ['warmth', 'fear', -0.4],        // REFINED: Warm → less fearful (self-regulation)
  ['warmth', 'joy', 0.4],          // REFINED: Warm → happier (moderate)
  
  // Excitement relationships
  ['excitement', 'sadness', -0.5], // Excited → less sad
  ['excitement', 'playfulness', 0.7], // Excited → more playful
  ['excitement', 'joy', 0.6],      // Excited → happier
];

/**
 * Emotion decay configuration
 * All emotions naturally return to 0.5 (neutral) over time
 * Decay rate is modified by personality traits
 */
export const EMOTION_DECAY = {
  /** Base decay rate per hour (0.0-1.0) */
  base_decay_rate: 0.05,
  
  /** Target value for decay (neutral state) */
  target_value: 0.5,
  
  /** Minimum decay per update (prevents infinite asymptotic approach) */
  min_decay_delta: 0.001,
};
