import { MatrixClient } from '../matrix/MatrixClient';
import { LobbyInfo } from '../matrix/types';

export interface LobbySearchOptions {
  gameId: string;
  limit?: number;
  includeInGame?: boolean;
}

export class LobbyDiscovery {
  static async searchLobbies(
    client: MatrixClient,
    options: LobbySearchOptions
  ): Promise<LobbyInfo[]> {
    const rawRooms = await client.listPublicLobbies(options.gameId, options.limit || 30);
    
    // Fetch room state if needed or filter by game tag
    return rawRooms.filter(room => {
      if (!options.includeInGame && room.status === 'in_game') {
        return false;
      }
      return true;
    });
  }
}
