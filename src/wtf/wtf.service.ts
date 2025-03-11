// src/wtf/wtf.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AddMatchSummaryDto, PlayerResultsDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';

@Injectable()
export class WtfService {
  private supabase;
  private levelProgression = new Map<number, number>(); // XP -> Level
  private xpRewards = new Map<string, number>(); // Action -> XP
  private matchSummaryTable = 'MatchSummary';
  private playerResultsTable = 'PlayerSpecificMatchSummary';
  private playerTable = 'WtfPlayers';
  private loginHistoryTable = 'LoginHistory';
  private playerStatisticsTable = 'PlayerStatistics';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    this.loadLevelProgression(); // Load XP to level mapping
    this.loadXPRewards(); // Load XP rewards
  }

  /**
   * Load Level Progression Table
   */
  async loadLevelProgression() {
    try {
      const { data, error } = await this.supabase
        .from('LevelProgression')
        .select('XP, Level');

      if (error) throw error;

      this.levelProgression.clear();
      data.forEach((row) => {
        this.levelProgression.set(row.XP, row.Level);
      });
    } catch (error) {
      console.error('Error loading level progression:', error);
    }
  }

  /**
   * Load XP Rewards Table
   */
  async loadXPRewards() {
    try {
      const { data, error } = await this.supabase
        .from('XPRewards')
        .select()
        .single();

      if (error) throw error;

      // Store XP rewards in memory
      this.xpRewards.set('MatchCompleteXP', data.MatchCompleteXP);
      this.xpRewards.set('MatchWinXP', data.MatchWinXP);
      this.xpRewards.set('RoundWinXP', data.RoundWinXP);
      this.xpRewards.set('KillXP', data.KillXP);
      this.xpRewards.set('AssistXP', data.AssistXP);
      this.xpRewards.set('FirstBloodXP', data.FirstBloodXP);
      this.xpRewards.set('LastAliveXP', data.LastAliveXP);
    } catch (error) {
      console.error('Error loading XP rewards:', error);
    }
  }

  /**
   * Get Level Based on XP
   */
  getLevelFromXP(totalXP: number): number {
    const xpArray = Array.from(this.levelProgression.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    for (const [xp, level] of xpArray) {
      if (totalXP < xp) return level;
    }
    return xpArray[xpArray.length - 1][1]; // Return max level if XP exceeds all
  }

  async updatePlayerStatistics(playerResult: PlayerResultsDto) {
    try {
      const playerID = playerResult.PlayerID;
      const timePlayed = playerResult.TimePlayed || '00:00:00';

      // Function to convert "HH:MM:SS" text format to total seconds
      const timeStringToSeconds = (time: string): number => {
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      };

      // Function to convert total seconds back to "HH:MM:SS" format
      const secondsToTimeString = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds]
          .map((v) => String(v).padStart(2, '0'))
          .join(':');
      };

      // Calculate XP Earned
      const xpEarned =
        playerResult.Kills * (this.xpRewards.get('KillXP') || 0) +
        playerResult.Assists * (this.xpRewards.get('AssistXP') || 0) +
        playerResult.FirstBlood * (this.xpRewards.get('FirstBloodXP') || 0) +
        playerResult.LastAlive * (this.xpRewards.get('LastAliveXP') || 0) +
        playerResult.RoundsWon * (this.xpRewards.get('RoundWinXP') || 0) +
        (this.xpRewards.get('MatchCompleteXP') || 0) +
        (playerResult.MatchOutcome === 'Win'
          ? this.xpRewards.get('MatchWinXP') || 0
          : 0);

      // Fetch player's current statistics
      const { data: currentStats, error: fetchError } = await this.supabase
        .from('PlayerStatistics')
        .select(
          'TotalXP, TotalMatches, MatchesWon, MatchesLost, TotalKills, TotalAssists, TotalDeaths, TotalScore, TotalObjectives, TotalDamageDealt, TotalDamageTaken, TotalHeadshots, TotalShotsFired, TotalShotsHit, TotalRoundsWon, TotalRoundsLost, TotalFirstBloods, TotalLastAlive, TotalTimePlayed',
        )
        .eq('PlayerID', playerID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      // Default values in case the player does not exist yet
      const prevStats = currentStats || {
        TotalXP: 0,
        TotalMatches: 0,
        MatchesWon: 0,
        MatchesLost: 0,
        TotalKills: 0,
        TotalAssists: 0,
        TotalDeaths: 0,
        TotalScore: 0,
        TotalObjectives: 0,
        TotalDamageDealt: 0,
        TotalDamageTaken: 0,
        TotalHeadshots: 0,
        TotalShotsFired: 0,
        TotalShotsHit: 0,
        TotalRoundsWon: 0,
        TotalRoundsLost: 0,
        TotalFirstBloods: 0,
        TotalLastAlive: 0,
        TotalTimePlayed: '00:00:00',
      };

      // Convert TotalTimePlayed (text) to seconds and sum
      const prevTotalSeconds = timeStringToSeconds(prevStats.TotalTimePlayed);
      const matchTimeSeconds = timeStringToSeconds(timePlayed);
      const newTotalSeconds = prevTotalSeconds + matchTimeSeconds;

      // Convert back to "HH:MM:SS" format
      const newTotalTimePlayed = secondsToTimeString(newTotalSeconds);

      // Accumulate new stats
      const totalXP = prevStats.TotalXP + xpEarned;
      const playerLevel = this.getLevelFromXP(totalXP);

      const { error } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(
          {
            PlayerID: playerID,
            TotalMatches: prevStats.TotalMatches + 1,
            MatchesWon:
              prevStats.MatchesWon +
              (playerResult.MatchOutcome === 'Win' ? 1 : 0),
            MatchesLost:
              prevStats.MatchesLost +
              (playerResult.MatchOutcome === 'Loss' ? 1 : 0),
            TotalKills: prevStats.TotalKills + playerResult.Kills,
            TotalAssists: prevStats.TotalAssists + playerResult.Assists,
            TotalDeaths: prevStats.TotalDeaths + playerResult.Deaths,
            TotalScore: prevStats.TotalScore + playerResult.Score,
            TotalObjectives:
              prevStats.TotalObjectives + playerResult.ObjectiveCompletions,
            TotalDamageDealt:
              prevStats.TotalDamageDealt + playerResult.DamageDealt,
            TotalDamageTaken:
              prevStats.TotalDamageTaken + playerResult.DamageTaken,
            TotalHeadshots: prevStats.TotalHeadshots + playerResult.Headshots,
            TotalShotsFired:
              prevStats.TotalShotsFired + playerResult.ShotsFired,
            TotalShotsHit: prevStats.TotalShotsHit + playerResult.ShotsHit,
            TotalRoundsWon: prevStats.TotalRoundsWon + playerResult.RoundsWon,
            TotalRoundsLost:
              prevStats.TotalRoundsLost + playerResult.RoundsLost,
            TotalXP: totalXP,
            Level: playerLevel,
            TotalFirstBloods:
              prevStats.TotalFirstBloods + (playerResult.FirstBlood || 0),
            TotalLastAlive:
              prevStats.TotalLastAlive + (playerResult.LastAlive || 0),
            TotalTimePlayed: newTotalTimePlayed, // Correctly handled as text
          },
          { onConflict: ['PlayerID'] },
        );

      if (error) throw error;
    } catch (error) {
      console.error(
        `Error updating PlayerStatistics for ${playerResult.PlayerID}:`,
        error,
      );
    }
  }

  async addPlayer(addPlayerDto: AddPlayerDto) {
    const currentTimestamp = new Date().toISOString();
    const playerData = {
      ...addPlayerDto,
      LoginTimestamp: currentTimestamp,
    };

    try {
      // Check if player already exists
      const { data, error: fetchError } = await this.supabase
        .from(this.playerTable)
        .select()
        .eq('PlayerID', addPlayerDto.PlayerID);

      if (fetchError) throw fetchError;

      if (data.length > 0) {
        // Player exists, update record
        const { error: updateError } = await this.supabase
          .from(this.playerTable)
          .update(playerData)
          .eq('PlayerID', addPlayerDto.PlayerID);

        if (updateError) throw updateError;
      } else {
        // New player, insert record
        const { error: insertError } = await this.supabase
          .from(this.playerTable)
          .insert(playerData);

        if (insertError) throw insertError;

        // Insert new row into PlayerStatistics for the new player (Only PlayerID required)
        const { error: statisticsError } = await this.supabase
          .from(this.playerStatisticsTable)
          .insert({ PlayerID: addPlayerDto.PlayerID });

        if (statisticsError) throw statisticsError;
      }

      // Insert login history
      const { error: loginHistoryError } = await this.supabase
        .from(this.loginHistoryTable)
        .insert({ PlayerID: addPlayerDto.PlayerID });

      if (loginHistoryError) throw loginHistoryError;

      return { message: 'New player added successfully' };
    } catch (error) {
      return { message: error.message };
    }
  }

  async addMatchSummary(addMatchSummaryDto: AddMatchSummaryDto) {
    try {
      // Start by inserting the match summary
      const { data: matchData, error: matchError } = await this.supabase
        .from(this.matchSummaryTable)
        .insert([addMatchSummaryDto.MatchSummary])
        .select()
        .single();

      if (matchError)
        throw new Error(`Match summary insert failed: ${matchError.message}`);

      const matchID = matchData.MatchID;

      // Prepare player results for bulk insert
      const playerResults = addMatchSummaryDto.PlayerResults.map((player) => ({
        ...player,
        MatchID: matchID, // Associate with inserted match
      }));

      // Insert player match results in bulk
      const { error: playerResultsError } = await this.supabase
        .from(this.playerResultsTable)
        .insert(playerResults);

      if (playerResultsError)
        throw new Error(
          `Player results insert failed: ${playerResultsError.message}`,
        );

      // Update player statistics for each player in a loop
      for (const playerResult of addMatchSummaryDto.PlayerResults) {
        await this.updatePlayerStatistics(playerResult);
      }

      return { message: 'Match summary and player stats updated successfully' };
    } catch (error) {
      console.error('Error in addMatchSummary:', error);

      // Cleanup: Remove the inserted match summary if an error occurred after insertion
      if (addMatchSummaryDto.MatchSummary?.MatchID) {
        await this.supabase
          .from(this.matchSummaryTable)
          .delete()
          .eq('MatchID', addMatchSummaryDto.MatchSummary.MatchID);
      }

      return { message: `Transaction failed: ${error.message}` };
    }
  }

  async getGameData() {
    try {
      // Fetch data from all tables concurrently
      const [
        { data: levelProgressionData, error: levelError },
        { data: weaponStatsData, error: weaponError },
        { data: xpRewardsData, error: xpError },
        { data: movementStatsData, error: movementError },
      ] = await Promise.all([
        this.supabase.from('LevelProgression').select('*'),
        this.supabase.from('WeaponStats').select(`
          "Name",
          "MovementSpeed",
          "ADSSpeed",
          "LoadedReloadSpeed",
          "EmptyReloadSpeed",
          "EquipSpeed",
          "FirstEquipSpeed",
          "UnequipSpeed",
          "SpreadExponent",
          "BaseDamage",
          "PelletsPerCartridge",
          "MaxMagazineAmmo",
          "BulletVelocity",
          "FireRate",
          "MaximumRange"
        `),
        this.supabase.from('XPRewards').select('*').single(), // Expecting a single row
        this.supabase.from('MovementStats').select('*'),
      ]);

      // Handle errors if any
      if (levelError || weaponError || xpError || movementError) {
        throw new Error(
          `Error fetching data: ${
            levelError?.message ||
            weaponError?.message ||
            xpError?.message ||
            movementError?.message
          }`,
        );
      }

      // Structure the final object
      const gameData = {
        LevelProgression: levelProgressionData.reduce((acc, row) => {
          acc[row.Level] = row.XP;
          return acc;
        }, {}), // Convert to { Level: XP } mapping

        WeaponStats: weaponStatsData.reduce((acc, weapon) => {
          acc[weapon.Name] = { ...weapon };
          return acc;
        }, {}), // Convert to { "WeaponName": {weapon data} }

        XPRewards: xpRewardsData, // Single row expected, keeping as an object

        MovementStats: movementStatsData.reduce((acc, row) => {
          acc[row.Level] = { ...row };
          return acc;
        }, {}), // Convert to { Level: {movement data} }
      };

      return gameData;
    } catch (error) {
      console.error('Error in getAllGameData:', error);
      return { error: error.message };
    }
  }
}
