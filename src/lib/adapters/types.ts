export interface DateRange {
  start: Date;
  end: Date;
}

export interface GlucoseReading {
  timestamp: Date;
  value: number; // mg/dL
  mealTag?: "pre" | "post" | "fasting";
  note?: string;
}

export interface SleepRecord {
  date: string; // YYYY-MM-DD
  durationHours: number;
  deepHours: number;
  remHours: number;
  score?: number; // 0-100
  hrv?: number; // ms
  restingHR?: number; // bpm
}

export interface LabResult {
  date: string;
  marker: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

export interface WeightRecord {
  date: string;
  weightLbs: number;
  bodyFatPct?: number;
  muscleMassLbs?: number;
}

export interface MealRecord {
  id: string;
  timestamp: Date;
  description: string;
  carbsG?: number;
  proteinG?: number;
  fiberG?: number;
  notes?: string;
  glucoseResponse?: {
    baselineGlucose: number;
    peakGlucose: number;
    minutesToPeak: number;
    auc2h: number; // area under curve over 2h
  };
}

export interface ActivityRecord {
  date: string;
  steps: number;
  activeMinutes: number;
  trainingLoad?: number;
  vo2Max?: number;
  stressScore?: number;
}

export interface DataSourceAdapter {
  name: string;
  getGlucose(range: DateRange): Promise<GlucoseReading[]>;
  getSleep(range: DateRange): Promise<SleepRecord[]>;
  getLabs(): Promise<LabResult[]>;
  getWeight(range: DateRange): Promise<WeightRecord[]>;
  getMeals(range: DateRange): Promise<MealRecord[]>;
  getActivity(range: DateRange): Promise<ActivityRecord[]>;
}
