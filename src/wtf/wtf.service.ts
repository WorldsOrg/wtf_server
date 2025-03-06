// src/wtf/wtf.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AddMatchSummaryDto } from './dto/match.summary.dto';

@Injectable()
export class WtfService {
  private supabase;
  private matchSummaryTable = 'MatchSummary';
  private playerResultsTable = 'PlayerSpecificMatchSummary';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );
  }

  async saveMatchSummary(addMatchSummaryDto: AddMatchSummaryDto) {
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
    return { message: 'Match summary saved successfully' };
  }
}
