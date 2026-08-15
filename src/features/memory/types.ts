export interface MonthOverviewStats {
  monthTs: number;
  monthNameUpper: string;
  yearNumber: number;
  momentCount: number;
  photoCount: number;
  audioCount: number;
  places: string[];
}

export interface PulseDay {
  dayNumber: number;
  dayTs: number;
  momentCount: number;
  photoCount: number;
  audioCount: number;
  hasLocation: boolean;
  places: string[];
  heightFactor: number;
}

export interface MonthPulseData {
  daysInMonth: number;
  activeDaysCount: number;
  totalMoments: number;
  maxDayMoments: number;
  days: PulseDay[];
  startDayLabel: string;
  endDayLabel: string;
}
