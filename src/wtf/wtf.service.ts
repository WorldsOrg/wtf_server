// src/wtf/wtf.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import {
  AddMatchSummaryDto,
  PlayerMatchStatisticsDto,
  PlayerStatisticsDto,
  PlayerWeaponMatchStatsInsert,
  ResolvedPlayerDto,
} from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';
import {
  MatchPlayerStatsInput,
  TotalPlayerStatsInput,
} from './dto/player.statistics.dto';

@Injectable()
export class WtfService {
  private supabase;
  private levelProgression = new Map<number, number>(); // XP -> Level
  private xpRewards = new Map<string, number>(); // Action -> XP
  private devSteamIds = new Set<string>(); // Store dev Steam IDs in memory
  private weaponNameToId: Map<string, number> = new Map();
  private matchSummaryTable = 'MatchSummary';
  private playerResultsTable = 'PlayerSpecificMatchSummary';
  private playerTable = 'WtfPlayers';
  private loginHistoryTable = 'LoginHistory';
  private playerStatisticsTable = 'PlayerStatistics';
  private devSteamIdsTable = 'DevSteamIds';
  private weaponsTable = 'WeaponStats';
  private weaponStatsTable = 'PlayerWeaponMatchStats';
  private unrealEditorEpicID = 'unrealeditor';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    this.loadWeaponStats(); // Load weapon stats and map names to IDs
    this.loadLevelProgression(); // Load XP to level mapping
    this.loadXPRewards(); // Load XP rewards
    this.loadDevSteamIds(); // Load dev Steam IDs on startup
  }

  /**
   * Load Weapon Stats and map Name to ID
   */
  async loadWeaponStats() {
    try {
      const { data, error } = await this.supabase
        .from(this.weaponsTable)
        .select('id, Name');

      if (error) throw error;

      this.weaponNameToId = new Map<string, number>();
      data.forEach((row) => {
        this.weaponNameToId.set(row.Name, row.id);
      });
    } catch (error) {
      console.error('Error loading weapon stats:', error);
    }
  }

  /**
   * Load Developer Steam IDs from the database
   */
  async loadDevSteamIds() {
    try {
      const { data, error } = await this.supabase
        .from(this.devSteamIdsTable)
        .select('SteamID');

      if (error) throw error;

      // Store SteamIDs in memory for quick lookup
      this.devSteamIds = new Set(data.map((row) => row.SteamID));
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
  calculateMatchPlayerXP(playerStats: MatchPlayerStatsInput): number {
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
  calculatePlayerXP(playerStats: TotalPlayerStatsInput): number {
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

  async updatePlayerStatistics(playerResult: PlayerStatisticsDto) {
    try {
      const epicID = playerResult.EpicID;
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
          'TotalXP, TotalMatches, MatchesWon, MatchesLost, TotalKills, TotalAssists, TotalDeaths, TotalScore, TotalObjectives, TotalDamageDealt, TotalDamageTaken, TotalHeadshots, TotalShotsFired, TotalShotsHit, TotalRoundsWon, TotalRoundsLost, TotalFirstBloods, TotalLastAlive, TotalTimePlayed, TotalMatchesQuitEarly',
        )
        .eq('EpicID', epicID)
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
        TotalMatchesQuitEarly: 0,
      };

      // Convert TotalTimePlayed (text) to seconds and sum
      const prevTotalSeconds = timeStringToSeconds(prevStats.TotalTimePlayed);
      const matchTimeSeconds = timeStringToSeconds(timePlayed);
      const newTotalSeconds = prevTotalSeconds + matchTimeSeconds;

      // Convert back to "HH:MM:SS" format
      const newTotalTimePlayed = secondsToTimeString(newTotalSeconds);

      // Accumulate new stats
      const totalXP = prevStats.TotalXP + playerResult.XPEarned;
      const playerLevel = this.getLevelFromXP(totalXP);

      const { error } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(
          {
            EpicID: epicID,
            TotalMatches: prevStats.TotalMatches + 1,
            MatchesWon:
              prevStats.MatchesWon +
              (playerResult.MatchOutcome === 'Win' &&
              playerResult.QuitEarly !== 1
                ? 1
                : 0),
            MatchesLost:
              prevStats.MatchesLost +
              (playerResult.MatchOutcome === 'Loss' ||
              playerResult.QuitEarly === 1
                ? 1
                : 0),
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
            TotalMatchesQuitEarly:
              prevStats.TotalMatchesQuitEarly + playerResult.QuitEarly,
          },
          { onConflict: ['EpicID'] },
        );

      if (error) throw error;
    } catch (error) {
      console.error(
        `Error updating PlayerStatistics for ${playerResult.EpicID}:`,
        error,
      );
    }
  }

  async addPlayer(addPlayerDto: AddPlayerDto) {
    const currentTimestamp = new Date().toISOString();

    // Normalize empty string values
    const normalizedEpicID =
      addPlayerDto.EpicID?.trim() === '' ? null : addPlayerDto.EpicID;
    const normalizedSteamID =
      addPlayerDto.SteamID?.trim() === '' ? null : addPlayerDto.SteamID;

    // ❌ Require at least one ID
    if (!normalizedEpicID && !normalizedSteamID) {
      throw new Error('You must provide either SteamID or EpicID.');
    }

    try {
      // 🔍 Check if SteamID is in DevSteamIds
      const isDev = normalizedSteamID
        ? this.devSteamIds.has(normalizedSteamID)
        : false;

      // Look for existing player by EpicID or SteamID
      let query = this.supabase.from(this.playerTable).select('*').limit(1);

      if (normalizedEpicID && normalizedSteamID) {
        query = query.or(
          `EpicID.eq.${normalizedEpicID},SteamID.eq.${normalizedSteamID}`,
        );
      } else if (normalizedEpicID) {
        query = query.eq('EpicID', normalizedEpicID);
      } else if (normalizedSteamID) {
        query = query.eq('SteamID', normalizedSteamID);
      }

      const { data: existingPlayers, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const updateData = {
        ...addPlayerDto,
        EpicID: normalizedEpicID,
        SteamID: normalizedSteamID,
        LoginTimestamp: currentTimestamp,
        Type: isDev ? 'dev' : null,
      };

      if (existingPlayers.length > 0) {
        // 🔄 Player exists → Update
        const existing = existingPlayers[0];

        const { error: updateError } = await this.supabase
          .from(this.playerTable)
          .update(updateData)
          .eq('PlayerID', existing.PlayerID);

        if (updateError) throw updateError;

        // 🕒 Insert login history
        await this.supabase.from(this.loginHistoryTable).insert({
          PlayerID: existing.PlayerID,
          GameVersion: addPlayerDto.GameVersion,
        });

        // 🎯 Insert PlayerStatistics if this is the first time EpicID is being set
        const hadNoEpicIDBefore = !existing.EpicID && normalizedEpicID;

        if (hadNoEpicIDBefore) {
          const { error: statsInsertError } = await this.supabase
            .from(this.playerStatisticsTable)
            .insert({
              PlayerID: existing.PlayerID,
              EpicID: normalizedEpicID,
            });

          if (statsInsertError) throw statsInsertError;
        }

        return { message: 'Player updated and login recorded' };
      } else {
        // 🆕 New player → Insert
        const insertResponse = await this.supabase
          .from(this.playerTable)
          .insert(updateData)
          .select('PlayerID, EpicID')
          .single();

        if (insertResponse.error) throw insertResponse.error;

        const newPlayerID = insertResponse.data.PlayerID;

        // 🕒 Insert login history
        await this.supabase.from(this.loginHistoryTable).insert({
          PlayerID: newPlayerID,
          GameVersion: addPlayerDto.GameVersion,
        });

        // 🎯 If EpicID is present on new player, insert PlayerStatistics
        if (normalizedEpicID) {
          const { error: statsInsertError } = await this.supabase
            .from(this.playerStatisticsTable)
            .insert({
              PlayerID: newPlayerID,
              EpicID: normalizedEpicID,
            });

          if (statsInsertError) throw statsInsertError;
        }

        return { message: 'New player created and login recorded' };
      }
    } catch (error) {
      return { message: error.message || 'An error occurred' };
    }
  }

  async getPlayerEpic(epicID: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.playerTable)
        .select('*')
        .eq('EpicID', epicID)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error(`Error fetching player with ID ${epicID}:`, error);
      return { error: error.message };
    }
  }

  async getPlayerSteam(steamID: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.playerTable)
        .select('*')
        .eq('SteamID', steamID)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error(`Error fetching player with ID ${steamID}:`, error);
      return { error: error.message };
    }
  }

  async addMatchSummary(addMatchSummaryDto: AddMatchSummaryDto) {
    try {
      // 1. Insert match summary
      const { data: matchData, error: matchError } = await this.supabase
        .from(this.matchSummaryTable)
        .insert([addMatchSummaryDto.MatchSummary])
        .select()
        .single();

      if (matchError) {
        throw new Error(`Match summary insert failed: ${matchError.message}`);
      }

      const matchID = matchData.MatchID;
      const resolvedResults: ResolvedPlayerDto[] = [];
      const weaponStatsInserts: PlayerWeaponMatchStatsInsert[] = [];

      // 2. Resolve PlayerID from EpicID for each player
      for (const player of addMatchSummaryDto.PlayerResults) {
        const epicID =
          player.EpicID == '' || null ? this.unrealEditorEpicID : player.EpicID;
        const { data: playerRow, error: lookupError } = await this.supabase
          .from(this.playerTable)
          .select('PlayerID')
          .eq('EpicID', epicID)
          .single();

        if (lookupError || !playerRow?.PlayerID) {
          console.warn(
            `Skipping player with EpicID ${player.EpicID}: Not found`,
          );
          continue;
        }

        const matchXP =
          player.QuitEarly == 1 ? 0 : this.calculateMatchPlayerXP(player);

        // Add player match stats with resolved PlayerID
        resolvedResults.push({
          ...player,
          PlayerID: playerRow.PlayerID,
          MatchID: matchID,
          DamageDealt: Math.round(player.DamageDealt), // Round DamageDealt
          DamageTaken: Math.round(player.DamageTaken), // Round DamageTaken
          EpicID: epicID,
          XPEarned: matchXP,
        });

        // Collect weapon stats if present
        if (player.PlayerWeaponStats?.length > 0) {
          const weaponInserts = player.PlayerWeaponStats.map((weapon) => ({
            MatchID: matchID,
            EpicID: epicID,
            WeaponID: this.weaponNameToId.get(weapon.WeaponName) || null,
            ShotsFired: weapon.ShotsFired ?? null,
            ShotsHit: weapon.ShotsHit ?? null,
            Kills: weapon.Kills ?? null,
            Headshots: weapon.Headshots ?? null,
            DamageDealt: Math.round(weapon.DamageDealt) ?? null,
            TimeUsed: weapon.TimeUsed ?? null,
            Reloads: weapon.Reloads ?? null,
            AmmoUsed: weapon.AmmoUsed ?? null,
            KillAssists: weapon.KillAssists ?? null,
            DeathsWhileUsing: weapon.DeathsWhileUsing ?? null,
            Multikills: weapon.Multikills ?? null,
            WeaponSwapCount: weapon.WeaponSwapCount ?? null,
            MissedShots: weapon.MissedShots ?? null,
            PenetrationKills: weapon.PenetrationKills ?? null,
            WeaponPickups: weapon.WeaponPickups ?? null,
            DroppedWeaponKills: weapon.DroppedWeaponKills ?? null,
            MeleeKills: weapon.MeleeKills ?? null,
            SuppressedKills: weapon.SuppressedKills ?? null,
            ADSTime: weapon.ADSTime ?? null,
            HipfireShotsFired: weapon.HipfireShotsFired ?? null,
            HipfireHits: weapon.HipfireHits ?? null,
          }));

          weaponStatsInserts.push(...weaponInserts);
        }
      }

      if (resolvedResults.length === 0) {
        throw new Error('No valid players found for this match summary');
      }

      // 3. Insert PlayerSpecificMatchSummary entries
      const matchSummaryInserts: PlayerMatchStatisticsDto[] =
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resolvedResults.map(({ PlayerWeaponStats, PlayerID, ...rest }) => rest);

      const { error: playerResultsError } = await this.supabase
        .from(this.playerResultsTable)
        .insert(matchSummaryInserts)
        .select('MatchID, EpicID'); // Enforces read-after-write visibility

      if (playerResultsError) {
        throw new Error(
          `Player results insert failed: ${playerResultsError.message}`,
        );
      }

      // 4. Insert PlayerWeaponMatchStats entries (if any)
      if (weaponStatsInserts.length > 0) {
        const { error: weaponStatsError } = await this.supabase
          .from(this.weaponStatsTable)
          .insert(weaponStatsInserts);

        if (weaponStatsError) {
          throw new Error(
            `Weapon stats insert failed: ${weaponStatsError.message}`,
          );
        }
      }

      // 5. Update long-term player statistics (XP, K/D, etc.)
      for (const player of resolvedResults) {
        await this.updatePlayerStatistics(player);
      }

      return {
        message:
          'Match summary, player results, and weapon stats added successfully',
      };
    } catch (error) {
      console.error('Error in addMatchSummary:', error);

      // Optional rollback if match insert succeeded
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
      const [
        { data: levelProgressionData, error: levelError },
        { data: weaponStatsData, error: weaponError },
        { data: xpRewardsData, error: xpError },
        { data: movementStatsData, error: movementError },
        { data: remoteConfigData, error: remoteError },
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
        this.supabase.from('XPRewards').select('*').single(),
        this.supabase.from('MovementStats').select('*'),
        this.supabase
          .from('RemoteConfig')
          .select('id, note')
          .eq('isActive', true)
          .single(),
      ]);

      if (
        levelError ||
        weaponError ||
        xpError ||
        movementError ||
        remoteError
      ) {
        throw new Error(
          `Error fetching data: ${
            levelError?.message ||
            weaponError?.message ||
            xpError?.message ||
            movementError?.message ||
            remoteError?.message
          }`,
        );
      }

      const gameData = {
        LevelProgression: levelProgressionData.reduce((acc, row) => {
          acc[row.Level] = row.XP;
          return acc;
        }, {}),
        WeaponStats: weaponStatsData.reduce((acc, weapon) => {
          acc[weapon.Name] = { ...weapon };
          return acc;
        }, {}),
        XPRewards: xpRewardsData,
        MovementStats: movementStatsData.reduce((acc, row) => {
          acc[row.Level] = { ...row };
          return acc;
        }, {}),
        RemoteConfig: remoteConfigData
          ? {
              id: remoteConfigData.id,
              note: remoteConfigData.note,
            }
          : null,
      };

      return gameData;
    } catch (error) {
      console.error('Error in getAllGameData:', error);
      return { error: error.message };
    }
  }

  async getPlayerStatsBySteamID(steamID: string) {
    try {
      const { data: player, error: playerError } = await this.supabase
        .from(this.playerTable)
        .select('PlayerID')
        .eq('SteamID', steamID)
        .single();

      if (playerError || !player)
        throw new Error('Player not found with this SteamID');

      const { data: stats, error: statsError } = await this.supabase
        .from(this.playerStatisticsTable)
        .select('*')
        .eq('PlayerID', player.PlayerID)
        .single();

      if (statsError) throw statsError;

      return stats;
    } catch (error) {
      console.error(`Error fetching stats for SteamID ${steamID}:`, error);
      return { error: error.message };
    }
  }

  async getPlayerStatsByEpicID(epicID: string) {
    try {
      const { data: stats, error: statsError } = await this.supabase
        .from(this.playerStatisticsTable)
        .select('*')
        .eq('EpicID', epicID)
        .single();

      if (statsError) throw statsError;

      return stats;
    } catch (error) {
      console.error(`Error fetching stats for EpicID ${epicID}:`, error);
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
        .in('EpicID', playerIDs);

      if (error) {
        throw error;
      }

      // Transform the array into an object with EpicID as the key
      const formattedData = data.reduce((acc, playerStat) => {
        acc[playerStat.EpicID] = playerStat;
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
        .select('EpicID, PlayerID, TotalXP');

      if (fetchError) throw fetchError;

      if (!players || players.length === 0) {
        console.log('No player data found to update levels.');
        return;
      }

      const updates = players.map((player) => ({
        EpicID: player.EpicID,
        PlayerID: player.PlayerID,
        Level: this.getLevelFromXP(player.TotalXP),
      }));

      // Perform bulk update
      const { error: updateError } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(updates, { onConflict: ['EpicID', 'PlayerID'] });

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
          'EpicID, PlayerID, TotalKills, TotalAssists, TotalFirstBloods, TotalLastAlive, TotalRoundsWon, TotalMatches, MatchesWon, TotalXP',
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
          EpicID: player.EpicID,
          PlayerID: player.PlayerID,
          TotalXP: totalXP,
          Level: this.getLevelFromXP(totalXP),
        };
      });

      // Perform bulk update
      const { error: updateError } = await this.supabase
        .from(this.playerStatisticsTable)
        .upsert(updates, { onConflict: ['EpicID', 'PlayerID'] });

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
      await this.loadDevSteamIds();

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
