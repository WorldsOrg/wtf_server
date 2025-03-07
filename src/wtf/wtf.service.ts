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

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );
  }

  async addPlayer(addPlayerDto: AddPlayerDto) {
    try {
      const currentTimestamp = new Date().toISOString();
      const playerData = {
        ...addPlayerDto,
        LoginTimestamp: currentTimestamp,
      };

      const { error } = await this.supabase
        .from(this.playerTable)
        .insert(playerData);

      if (error) {
        throw error;
      }
    } catch (error) {
      return { message: error.message };
    }
    return { message: 'New player added successfully' };
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
