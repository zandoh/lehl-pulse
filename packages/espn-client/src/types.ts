export interface ESPNClientConfig {
  leagueId: string;
  espnS2?: string;
  swid?: string;
}

export interface ESPNLeagueSettings {
  name: string;
  size: number;
  scoringType: string;
  playoffTeamCount?: number;
  regularSeasonMatchupPeriodCount?: number;
  finalScoringPeriod?: number;
  firstScoringPeriod?: number;
  scheduleSettings?: {
    matchupPeriods?: Record<string, number[]>;
  };
}

export interface ESPNTeam {
  id: number;
  abbrev: string;
  name: string;
  location: string;
  logo?: string;
  logoType?: string;
  owners?: string[];
  primaryOwner?: string;
  record?: {
    overall: {
      wins: number;
      losses: number;
      ties: number;
      percentage: number;
      pointsFor: number;
      pointsAgainst: number;
    };
  };
}

export interface ESPNMatchup {
  id: number;
  matchupPeriodId: number;
  winner?: 'HOME' | 'AWAY' | 'UNDECIDED';
  home: {
    teamId: number;
    totalPoints: number;
    rosterForCurrentScoringPeriod?: {
      entries?: any[];
    };
  };
  away: {
    teamId: number;
    totalPoints: number;
    rosterForCurrentScoringPeriod?: {
      entries?: any[];
    };
  };
  playoffTierType?: string;
}

export interface ESPNScheduleItem {
  matchupPeriodId: number;
  home: {
    teamId: number;
    totalPoints?: number;
    cumulativeScore?: {
      wins: number;
      losses: number;
      ties: number;
    };
  };
  away: {
    teamId: number;
    totalPoints?: number;
    cumulativeScore?: {
      wins: number;
      losses: number;
      ties: number;
    };
  };
  winner?: 'HOME' | 'AWAY' | 'UNDECIDED';
  playoffTierType?: string;
}

export interface ESPNMember {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface ESPNLeagueResponse {
  id: number;
  scoringPeriodId: number;
  seasonId: number;
  status: {
    currentMatchupPeriod: number;
    finalScoringPeriod: number;
    firstScoringPeriod: number;
    isActive: boolean;
  };
  settings: ESPNLeagueSettings;
  teams?: ESPNTeam[];
  schedule?: ESPNScheduleItem[];
  members?: ESPNMember[];
}

export interface FullLeagueData {
  leagueId: string;
  year: number;
  settings: ESPNLeagueSettings;
  teams: ESPNTeam[];
  matchups: ESPNScheduleItem[];
  members: ESPNMember[];
}

export interface ESPNApiError {
  error: string;
  message?: string;
  statusCode: number;
}
