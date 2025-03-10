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

      console.log('Level progression loaded:', this.levelProgression);
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

      console.log('XP rewards loaded:', this.xpRewards);
    } catch (error) {
      console.error('Error loading XP rewards:', error);
    }
  }

  /**
   * Get Level Based on XP
   */
  getLevelFromXP(totalXP: number): number {
    let playerLevel = 0;

    for (const [xp, level] of this.levelProgression.entries()) {
      if (totalXP >= xp) {
        playerLevel = level;
      } else {
        break;
      }
    }

    return playerLevel;
  }

  async updatePlayerStatistics(playerResult: PlayerResultsDto) {
    try {
      const playerID = playerResult.PlayerID;
      const timePlayed = playerResult.TimePlayed || '00:00:00';

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

      // Fetch player's current XP
      const { data: currentStats, error: fetchError } = await this.supabase
        .from('PlayerStatistics')
        .select('TotalXP')
        .eq('PlayerID', playerID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const totalXP = (currentStats?.TotalXP || 0) + xpEarned;

      // Get level from cached LevelProgression data
      const playerLevel = this.getLevelFromXP(totalXP);

      // Upsert player stats into PlayerStatistics
      const { error } = await this.supabase.from('PlayerStatistics').upsert(
        {
          PlayerID: playerID,
          TotalMatches: 1,
          MatchesWon: playerResult.MatchOutcome === 'Win' ? 1 : 0,
          MatchesLost: playerResult.MatchOutcome === 'Loss' ? 1 : 0,
          TotalKills: playerResult.Kills,
          TotalAssists: playerResult.Assists,
          TotalDeaths: playerResult.Deaths,
          TotalScore: playerResult.Score,
          TotalObjectives: playerResult.ObjectiveCompletions,
          TotalDamageDealt: playerResult.DamageDealt,
          TotalDamageTaken: playerResult.DamageTaken,
          TotalHeadshots: playerResult.Headshots,
          TotalShotsFired: playerResult.ShotsFired,
          TotalShotsHit: playerResult.ShotsHit,
          TotalRoundsWon: playerResult.RoundsWon,
          TotalRoundsLost: playerResult.RoundsLost,
          TotalXP: totalXP,
          Level: playerLevel,
          TotalFirstBloods: playerResult.FirstBlood || 0,
          TotalLastAlive: playerResult.LastAlive || 0,
          TotalTimePlayed: timePlayed,
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
      // Insert match summary
      const { error } = await this.supabase
        .from(this.matchSummaryTable)
        .insert(addMatchSummaryDto.MatchSummary);
      if (error) throw error;

      // Process each player's results
      for (const playerResult of addMatchSummaryDto.PlayerResults) {
        const result = {
          ...playerResult,
          MatchID: addMatchSummaryDto.MatchSummary.MatchID,
        };

        // Insert player match results
        const { error } = await this.supabase
          .from(this.playerResultsTable)
          .insert(result);
        if (error) throw error;

        // Update aggregated player statistics
        await this.updatePlayerStatistics(playerResult);
      }

      return { message: 'Match summary and player stats updated successfully' };
    } catch (error) {
      console.error('Error in addMatchSummary:', error);
      return { message: error.message };
    }
  }
}
