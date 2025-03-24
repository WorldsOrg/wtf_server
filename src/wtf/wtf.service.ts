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
  private devSteamIds = new Set<string>(); // Store dev Steam IDs in memory
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
    this.loadDevSteamIds(); // Load dev Steam IDs on startup
  }

  /**
   * Load Developer Steam IDs from the database
   */
  async loadDevSteamIds() {
    try {
      const { data, error } = await this.supabase
        .from('DevSteamIds')
        .select('SteamID');

      if (error) throw error;

      // Store SteamIDs in memory for quick lookup
      this.devSteamIds = new Set(data.map((row) => row.SteamID));
      console.log(`Loaded ${this.devSteamIds.size} developer Steam IDs.`);
    } catch (error) {
      console.error('Error loading developer Steam IDs:', error);
    }
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
    if (this.levelProgression.size === 0) {
      return 0; // Default level if no progression data
    }

    const xpArray = Array.from(this.levelProgression.entries()).sort(
      (a, b) => a[0] - b[0], // Sort by XP threshold in ascending order
    );

    let currentLevel = xpArray[0][1]; // Start at the lowest level

    for (const [xp, level] of xpArray) {
      if (totalXP >= xp) {
        currentLevel = level; // Assign level until XP exceeds threshold
      } else {
        break; // Stop iteration when totalXP is lower than the next threshold
      }
    }

    return currentLevel; // Return the last assigned level
  }

  /**
   * Calculate XP based on player statistics of the match
   */
  calculateMatchPlayerXP(playerStats: any): number {
    return (
      (playerStats.Kills || 0) * (this.xpRewards.get('KillXP') || 0) +
      (playerStats.Assists || 0) * (this.xpRewards.get('AssistXP') || 0) +
      (playerStats.FirstBlood || 0) *
        (this.xpRewards.get('FirstBloodXP') || 0) +
      (playerStats.LastAlive || 0) * (this.xpRewards.get('LastAliveXP') || 0) +
      (playerStats.RoundsWon || 0) * (this.xpRewards.get('RoundWinXP') || 0) +
      (playerStats.MatchOutcome ? 1 : 0) *
        (this.xpRewards.get('MatchCompleteXP') || 0) +
      (playerStats.MatchOutcome == 'Win' ? 1 : 0) *
        (this.xpRewards.get('MatchWinXP') || 0)
    );
  }

  /**
   * Calculate XP based on a player's statistics
   */
  calculatePlayerXP(playerStats: any): number {
    return (
      (playerStats.TotalKills || 0) * (this.xpRewards.get('KillXP') || 0) +
      (playerStats.TotalAssists || 0) * (this.xpRewards.get('AssistXP') || 0) +
      (playerStats.TotalFirstBloods || 0) *
        (this.xpRewards.get('FirstBloodXP') || 0) +
      (playerStats.TotalLastAlive || 0) *
        (this.xpRewards.get('LastAliveXP') || 0) +
      (playerStats.TotalRoundsWon || 0) *
        (this.xpRewards.get('RoundWinXP') || 0) +
      (playerStats.TotalMatches || 0) *
        (this.xpRewards.get('MatchCompleteXP') || 0) +
      (playerStats.MatchesWon || 0) * (this.xpRewards.get('MatchWinXP') || 0)
    );
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
      const totalXP =
        prevStats.TotalXP + this.calculateMatchPlayerXP(playerResult);
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
          .insert({
            PlayerID: addPlayerDto.PlayerID,
          });

        if (statisticsError) throw statisticsError;
      }

      // Insert login history
      const { error: loginHistoryError } = await this.supabase
        .from(this.loginHistoryTable)
        .insert({
          PlayerID: addPlayerDto.PlayerID,
          GameVersion: addPlayerDto.GameVersion,
        });

      if (loginHistoryError) throw loginHistoryError;

      return { message: 'New player added successfully' };
    } catch (error) {
      return { message: error.message };
    }
  }

  async getPlayer(playerID: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.playerTable)
        .select('*')
        .eq('PlayerID', playerID)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error(`Error fetching player with ID ${playerID}:`, error);
      return { error: error.message };
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

  async getPlayerStats(ids: string) {
    try {
      if (!ids) {
        return { error: 'No player IDs provided' };
      }

      // Convert comma-separated string to array
      const playerIDs = ids.split(',').map((id) => id.trim());

      const { data, error } = await this.supabase
        .from(this.playerStatisticsTable)
        .select('*')
        .in('PlayerID', playerIDs);

      if (error) {
        throw error;
      }

      // Transform the array into an object with PlayerID as the key
      const formattedData = data.reduce((acc, playerStat) => {
        acc[playerStat.PlayerID] = playerStat;
        return acc;
      }, {});

      return formattedData;
    } catch (error) {
      console.error('Error fetching player statistics:', error);
      return { error: error.message };
    }
  }

  async updateLevelProgression() {
    try {
      // Reload level progression data
      await this.loadLevelProgression();

      // Fetch all players' XP and current levels
      const { data: players, error: fetchError } = await this.supabase
        .from(this.playerStatisticsTable)
        .select('PlayerID, TotalXP');

      if (fetchError) throw fetchError;

      if (!players || players.length === 0) {
        console.log('No player data found to update levels.');
        return;
      }

      const updates = players.map((player) => ({
        PlayerID: player.PlayerID,
        Level: this.getLevelFromXP(player.TotalXP),
      }));

      // Perform bulk update
      const { error: updateError } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(updates, { onConflict: ['PlayerID'] });

      if (updateError) throw updateError;

      console.log(`Updated levels for ${updates.length} players.`);
    } catch (error) {
      console.error('Error updating player levels:', error);
    }
  }

  async updateXpRewards() {
    try {
      // Reload XP rewards data
      await this.loadXPRewards();

      // Fetch all players' match-related statistics
      const { data: players, error: fetchError } = await this.supabase
        .from(this.playerStatisticsTable)
        .select(
          'PlayerID, TotalKills, TotalAssists, TotalFirstBloods, TotalLastAlive, TotalRoundsWon, TotalMatches, MatchesWon, TotalXP',
        );

      if (fetchError) throw fetchError;

      if (!players || players.length === 0) {
        console.log('No player data found to update XP.');
        return;
      }

      // Process player XP recalculations
      const updates = players.map((player) => {
        const totalXP = this.calculatePlayerXP(player);
        return {
          PlayerID: player.PlayerID,
          TotalXP: totalXP,
          Level: this.getLevelFromXP(totalXP),
        };
      });

      // Perform bulk update
      const { error: updateError } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(updates, { onConflict: ['PlayerID'] });

      if (updateError) throw updateError;

      console.log(`Updated XP and levels for ${updates.length} players.`);
    } catch (error) {
      console.error('Error updating player XP and levels:', error);
    }
  }

  /**
   * Assign 'dev' type to players with matching SteamID
   */
  async updateDevPlayers() {
    try {
      if (this.devSteamIds.size === 0) {
        console.log('No developer Steam IDs loaded.');
        return;
      }

      const { error } = await this.supabase
        .from('WtfPlayers')
        .update({ Type: 'dev' })
        .in('SteamID', Array.from(this.devSteamIds));

      if (error) throw error;

      console.log('Updated WtfPlayers with dev status.');
    } catch (error) {
      console.error('Error updating dev players:', error);
    }
  }
}
