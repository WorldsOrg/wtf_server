// src/wtf/wtf.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AddMatchSummaryDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';

@Injectable()
export class WtfService {
  private supabase;
  private matchSummaryTable = 'MatchSummary';
  private playerResultsTable = 'PlayerSpecificMatchSummary';
  private playerTable = 'WtfPlayers';
  private loginHistoryTable = 'LoginHistory';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );
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
      const { error } = await this.supabase
        .from(this.matchSummaryTable)
        .insert(addMatchSummaryDto.MatchSummary);
      if (error) {
        throw error;
      }

      for (const playerResult of addMatchSummaryDto.PlayerResults) {
        const result = {
          ...playerResult,
          MatchID: addMatchSummaryDto.MatchSummary.MatchID,
        };

        const { error } = await this.supabase
          .from(this.playerResultsTable)
          .insert(result);
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      return { message: error };
    }
    return { message: 'Match summary added successfully' };
  }
}
