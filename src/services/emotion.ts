/**
 * Emotion Service
 * 
 * Manages bot's emotional state with:
 * - Bounded numeric emotions (0.0-1.0, neutral=0.5)
 * - Time-based decay toward neutral
 * - Emotion coupling (emotions influence each other)
 * - Personality-modulated behavior
 * - Deterministic, testable pure functions
 * 
 * Philosophy: Emotions are NOT decisions, only affect tone/warmth
 */

import { DatabaseService } from './database';
import { 
  DEFAULT_PERSONALITY, 
  EMOTION_COUPLING, 
  EMOTION_DECAY,
  type PersonalityConfig 
} from '../config/personality';

/** Emotional signal from interaction analysis */
export interface EmotionalSignal {
  /** Positive (>0) or negative (<0) sentiment (-1.0 to 1.0) */
  valence: number;
  
  /** How strong the emotion is (0.0 to 1.0) */
  intensity: number;
  
  /** Which emotions are affected */
  target_emotions: string[];
  
  /** Optional context for logging */
  context?: string;
}

/** Current emotional state */
export interface EmotionalState {
  [emotion: string]: number;
}

/** Emotion update result */
export interface EmotionUpdateResult {
  previous: EmotionalState;
  updated: EmotionalState;
  deltas: { [emotion: string]: number };
  decay_applied: boolean;
}

export class EmotionService {
  private personality: PersonalityConfig;
  private lastUpdateTime: Date | null = null;

  constructor(
    private dbService: DatabaseService,
    personality: PersonalityConfig = DEFAULT_PERSONALITY
  ) {
    this.personality = personality;
  }

  /**
   * Get current emotional state with lazy decay applied
   */
  async getCurrentState(): Promise<EmotionalState> {
    const rawState = await this.getRawState();
    const decayedState = this.applyTimeDecay(rawState);
    
    // If decay was applied, persist it
    if (this.hasDecayOccurred(rawState, decayedState)) {
      await this.persistState(decayedState);
    }
    
    return decayedState;
  }

  /**
   * Update emotions based on interaction signal
   */
  async updateFromInteraction(
    signal: EmotionalSignal,
    userTgId?: number
  ): Promise<EmotionUpdateResult> {
    // Rate limiting
    if (!this.canUpdate()) {
      const current = await this.getCurrentState();
      return {
        previous: current,
        updated: current,
        deltas: {},
        decay_applied: false
      };
    }

    // Get current state (with decay)
    const previousState = await this.getCurrentState();
    
    // Calculate primary emotion updates
    let updatedState = { ...previousState };
    const deltas: { [emotion: string]: number } = {};
    
    for (const emotion of signal.target_emotions) {
      const delta = this.calculateEmotionDelta(signal, emotion);
      updatedState[emotion] = this.clamp(
        (updatedState[emotion] || 0.5) + delta
      );
      deltas[emotion] = delta;
    }
    
    // Apply emotion coupling
    updatedState = this.applyEmotionCoupling(previousState, updatedState);
    
    // Clamp all values
    for (const emotion in updatedState) {
      updatedState[emotion] = this.clamp(updatedState[emotion]);
    }
    
    // Persist updated state
    await this.persistState(updatedState);
    this.lastUpdateTime = new Date();
    
    // Log interaction event
    if (userTgId) {
      await this.logInteractionEvent(signal, userTgId);
    }
    
    return {
      previous: previousState,
      updated: updatedState,
      deltas,
      decay_applied: true
    };
  }

  /**
   * Get emotional state description for AI context
   */
  async getEmotionalContext(): Promise<string> {
    const state = await this.getCurrentState();
    
    const dominant = this.getDominantEmotions(state, 3);
    const mood = this.interpretMood(state);
    
    return `Current Emotional State:
Mood: ${mood}
Dominant feelings: ${dominant.map(e => `${e.name} (${(e.value * 100).toFixed(0)}%)`).join(', ')}

Note: These emotions affect your tone and warmth, NOT your helpfulness or accuracy.`;
  }

  // ==========================================
  // PURE FUNCTIONS - Emotion Math
  // ==========================================

  /**
   * Calculate emotion delta from signal
   */
  private calculateEmotionDelta(signal: EmotionalSignal, emotion: string): number {
    const { valence, intensity } = signal;
    
    // Base change = valence * intensity * sensitivity
    const baseChange = valence * intensity * this.personality.emotional_sensitivity;
    
    // Apply personality modulation
    let modulated = baseChange;
    
    // Optimism increases positive changes, reduces negative
    if (valence > 0) {
      modulated *= (1 + this.personality.optimism * 0.3);
    } else {
      modulated *= (1 - this.personality.optimism * 0.2);
    }
    
    // Clamp to max delta
    return this.clamp(
      modulated,
      -this.personality.max_delta_per_interaction,
      this.personality.max_delta_per_interaction
    );
  }

  /**
   * Apply emotion coupling (emotions influencing each other)
   */
  private applyEmotionCoupling(
    previousState: EmotionalState,
    updatedState: EmotionalState
  ): EmotionalState {
    const coupled = { ...updatedState };
    
    for (const [source, target, strength] of EMOTION_COUPLING) {
      const sourceDelta = (updatedState[source] || 0.5) - (previousState[source] || 0.5);
      
      if (Math.abs(sourceDelta) < 0.01) continue; // Skip tiny changes
      
      const couplingEffect = sourceDelta * strength * 0.3; // 30% coupling strength
      coupled[target] = (coupled[target] || 0.5) + couplingEffect;
    }
    
    return coupled;
  }

  /**
   * Apply time-based decay toward neutral (0.5)
   */
  private applyTimeDecay(state: EmotionalState): EmotionalState {
    const decayed = { ...state };
    const hoursSinceUpdate = this.getHoursSinceLastUpdate();
    
    if (hoursSinceUpdate === 0) return state;
    
    // Calculate decay factor
    const decayFactor = 
      EMOTION_DECAY.base_decay_rate * 
      hoursSinceUpdate * 
      this.personality.forgiveness_rate /
      this.personality.rumination;
    
    // Apply decay toward neutral
    for (const emotion in decayed) {
      const current = decayed[emotion];
      const target = EMOTION_DECAY.target_value;
      const distance = target - current;
      
      let decay = distance * decayFactor;
      
      // Ensure minimum decay
      if (Math.abs(decay) < EMOTION_DECAY.min_decay_delta && distance !== 0) {
        decay = Math.sign(distance) * EMOTION_DECAY.min_decay_delta;
      }
      
      decayed[emotion] = this.clamp(current + decay);
    }
    
    return decayed;
  }

  /**
   * Clamp value to range
   */
  private clamp(value: number, min = 0.0, max = 1.0): number {
    return Math.max(min, Math.min(max, value));
  }

  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  /**
   * Get raw emotional state from database
   */
  private async getRawState(): Promise<EmotionalState> {
    const result = await this.dbService.executeSqlQuery(
      'SELECT emotion_name, value, last_updated FROM bot_emotional_state',
      [],
      { reason: 'Get current emotional state' }
    );
    
    const state: EmotionalState = {};
    for (const row of result) {
      state[row.emotion_name] = parseFloat(row.value);
      
      // Track last update time
      if (!this.lastUpdateTime || new Date(row.last_updated) > this.lastUpdateTime) {
        this.lastUpdateTime = new Date(row.last_updated);
      }
    }
    
    return state;
  }

  /**
   * Persist emotional state to database
   */
  private async persistState(state: EmotionalState): Promise<void> {
    for (const [emotion, value] of Object.entries(state)) {
      await this.dbService.executeSqlQuery(
        `INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
         VALUES ($1, $2, NOW())
         ON CONFLICT (emotion_name) DO UPDATE
         SET value = $2, last_updated = NOW()`,
        [emotion, value.toFixed(2)],
        { reason: 'Update emotional state' }
      );
    }
  }

  /**
   * Log interaction event
   */
  private async logInteractionEvent(
    signal: EmotionalSignal,
    userTgId: number
  ): Promise<void> {
    try {
      await this.dbService.executeSqlQuery(
        `INSERT INTO interaction_events 
         (user_tg_id, message_text, valence, intensity, target_emotions, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userTgId,
          signal.context || null,
          signal.valence.toFixed(2),
          signal.intensity.toFixed(2),
          signal.target_emotions
        ],
        { reason: 'Log interaction event' }
      );
    } catch (error) {
      console.warn('⚠️ [Emotion] Failed to log interaction event:', error);
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Check if enough time has passed since last update
   */
  private canUpdate(): boolean {
    if (!this.lastUpdateTime) return true;
    
    const msSinceUpdate = Date.now() - this.lastUpdateTime.getTime();
    return msSinceUpdate >= this.personality.update_cooldown_ms;
  }

  /**
   * Get hours since last emotional update
   */
  private getHoursSinceLastUpdate(): number {
    if (!this.lastUpdateTime) return 0;
    
    const msSinceUpdate = Date.now() - this.lastUpdateTime.getTime();
    return msSinceUpdate / (1000 * 60 * 60);
  }

  /**
   * Check if decay occurred
   */
  private hasDecayOccurred(before: EmotionalState, after: EmotionalState): boolean {
    for (const emotion in before) {
      if (Math.abs(before[emotion] - after[emotion]) > 0.001) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get dominant emotions
   */
  private getDominantEmotions(state: EmotionalState, count = 3): Array<{ name: string; value: number }> {
    return Object.entries(state)
      .map(([name, value]) => ({ 
        name, 
        value,
        distance: Math.abs(value - 0.5) // Distance from neutral
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, count);
  }

  /**
   * Interpret overall mood from emotional state
   */
  private interpretMood(state: EmotionalState): string {
    const joy = state.joy || 0.5;
    const sadness = state.sadness || 0.5;
    const anger = state.anger || 0.5;
    const affection = state.affection || 0.5;
    const playfulness = state.playfulness || 0.5;
    
    // Calculate overall valence
    const valence = (joy + affection + playfulness) / 3 - (sadness + anger) / 2;
    
    if (valence > 0.65) return 'Very positive and warm';
    if (valence > 0.55) return 'Positive and friendly';
    if (valence > 0.45) return 'Neutral and balanced';
    if (valence > 0.35) return 'Slightly guarded';
    return 'Cautious or distant';
  }
}
