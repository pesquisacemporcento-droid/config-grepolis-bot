export type FarmLevel = 'nivel1' | 'nivel2' | 'custom';

export interface FarmConfig {
  enabled: boolean;
  interval_min: number;
  interval_max: number;
  shuffle_cities: boolean;
}

export interface MarketConfig {
  enabled: boolean;
  target_town_id: string;
  send_wood: boolean;
  send_stone: boolean;
  send_silver: boolean;
  max_storage_percent: number;
  max_send_per_trip: number;
  check_interval: number;
  delay_between_trips: number;
  split_equally: boolean;
}

export interface BotConfig {
  enabled: boolean;
  farm_level?: FarmLevel; // Optional in JSON, used for UI state
  farm: FarmConfig;
  market: MarketConfig;
}

export const DEFAULT_CONFIG: BotConfig = {
  enabled: true,
  farm_level: 'nivel2',
  farm: {
    enabled: true,
    interval_min: 600,
    interval_max: 637,
    shuffle_cities: true,
  },
  market: {
    enabled: false,
    target_town_id: "",
    send_wood: true,
    send_stone: true,
    send_silver: true,
    max_storage_percent: 100,
    max_send_per_trip: 5000,
    check_interval: 300,
    delay_between_trips: 120,
    split_equally: true,
  },
};