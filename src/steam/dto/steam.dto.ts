export interface SteamResponse {
  response: {
    item_json: string;
  };
}

export interface SteamAuthResponse {
  response: {
    params?: {
      result: string;
      steamid: string;
      ownersteamid: string;
      vacbanned: boolean;
      publisherbanned: boolean;
    };
    error?: {
      errorcode: number;
      errordesc: string;
    };
  };
}
