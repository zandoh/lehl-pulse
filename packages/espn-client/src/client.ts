import type {
  ESPNClientConfig,
  ESPNLeagueResponse,
  FullLeagueData,
  ESPNApiError,
} from './types';

export class ESPNClient {
  private readonly baseUrl = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl';
  private readonly leagueId: string;
  private readonly espnS2?: string;
  private readonly swid?: string;

  constructor(config: ESPNClientConfig) {
    this.leagueId = config.leagueId;
    this.espnS2 = config.espnS2;
    this.swid = config.swid;
  }

  private buildUrl(year: number, views: string[] = []): string {
    const viewParams = views.length > 0 ? views.map(v => `view=${v}`).join('&') : '';
    const url = `${this.baseUrl}/seasons/${year}/segments/0/leagues/${this.leagueId}`;

    return viewParams ? `${url}?${viewParams}` : url;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.espnS2 && this.swid) {
      headers['Cookie'] = `espn_s2=${this.espnS2}; SWID=${this.swid}`;
    }

    return headers;
  }

  private async fetch<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        const error: ESPNApiError = {
          error: 'ESPN API request failed',
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };

        if (response.status === 401) {
          error.message = 'Unauthorized - check ESPN cookies (espn_s2 and SWID)';
        } else if (response.status === 404) {
          error.message = 'League not found - check league ID and year';
        }

        throw new Error(error.message);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Unknown error fetching from ESPN API');
    }
  }

  /**
   * Get basic league information for a specific year
   *
   * @param year - The season year (e.g., 2024)
   * @returns League data including settings
   */
  async getLeague(year: number): Promise<ESPNLeagueResponse> {
    const url = this.buildUrl(year, ['mSettings']);

    return this.fetch<ESPNLeagueResponse>(url);
  }

  /**
   * Get league teams for a specific year
   *
   * @param year - The season year
   * @returns League data with teams
   */
  async getTeams(year: number): Promise<ESPNLeagueResponse> {
    const url = this.buildUrl(year, ['mTeam']);

    return this.fetch<ESPNLeagueResponse>(url);
  }

  /**
   * Get league schedule/matchups for a specific year
   *
   * @param year - The season year
   * @returns League data with schedule
   */
  async getSchedule(year: number): Promise<ESPNLeagueResponse> {
    const url = this.buildUrl(year, ['mMatchup']);
    return this.fetch<ESPNLeagueResponse>(url);
  }

  /**
   * Get complete league data (teams + schedule + settings + members) for a specific year
   *
   * This is the main method you'll use to fetch all data needed for database import.
   *
   * @param year - The season year (e.g., 2024)
   * @returns Complete league data ready for database insertion
   */
  async getFullLeagueData(year: number): Promise<FullLeagueData> {
    // Fetch all data with all views in one request
    const url = this.buildUrl(year, ['mTeam', 'mMatchup', 'mSettings', 'mMembers']);
    const response = await this.fetch<ESPNLeagueResponse>(url);

    return {
      leagueId: this.leagueId,
      year,
      settings: response.settings,
      teams: response.teams || [],
      matchups: response.schedule || [],
      members: response.members || [],
    };
  }
}
