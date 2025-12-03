export type FarmLevel = 'nivel1' | 'nivel2' | 'custom';

export interface FarmConfig {
  enabled: boolean;
  interval_min: number;
  interval_max: number;
  shuffle_cities: boolean;
}

export interface TransportConfig {
  enabled: boolean;
  target_town_id: string | number;
  max_percent: number;
  interval_seconds: number;
  send_wood: boolean;
  send_stone: boolean;
  send_silver: boolean;
  per_send_limit: number;
  delay_seconds: number;
  divide_equally: boolean;
}

export interface BotConfig {
  enabled: boolean;
  farm_level: FarmLevel;
  farm: FarmConfig;
  transports: TransportConfig;
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
  transports: {
    enabled: false,
    target_town_id: "",
    max_percent: 100,
    interval_seconds: 300,
    send_wood: true,
    send_stone: true,
    send_silver: true,
    per_send_limit: 5000,
    delay_seconds: 120,
    divide_equally: true,
  },
};
