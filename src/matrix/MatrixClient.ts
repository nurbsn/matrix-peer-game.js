import { TypedEventEmitter } from '../core/events';
import {
  MatrixAuth,
  MatrixEvent,
  MatrixPublicRoomsResponse,
  MatrixSyncResponse,
  CreateLobbyOptions,
  LobbyStateEventContent,
  PlayerStateEventContent,
  LobbyInfo,
  LobbyChatMessage
} from './types';

export interface MatrixClientEvents {
  sync: MatrixSyncResponse;
  roomState: { roomId: string; event: MatrixEvent };
  roomMessage: { roomId: string; message: LobbyChatMessage };
  playerStateChange: { roomId: string; userId: string; state: PlayerStateEventContent };
  lobbyStateChange: { roomId: string; state: LobbyStateEventContent };
  error: Error;
}

export class MatrixClient extends TypedEventEmitter<MatrixClientEvents> {
  private homeserver: string;
  private auth: MatrixAuth | null = null;
  private syncToken: string | null = null;
  private isSyncing = false;
  private syncAbortController: AbortController | null = null;
  private txnCounter = 0;

  constructor(homeserver = 'https://matrix.org') {
    super();
    this.homeserver = homeserver.replace(/\/+$/, '');
  }

  get isAuthenticated(): boolean {
    return this.auth !== null;
  }

  get currentUserId(): string | null {
    return this.auth?.userId ?? null;
  }

  get currentAuth(): MatrixAuth | null {
    return this.auth;
  }

  setAuth(auth: MatrixAuth): void {
    this.auth = auth;
    this.homeserver = auth.homeserver.replace(/\/+$/, '');
  }

  private getTxnId(): string {
    return `m_${Date.now()}_${++this.txnCounter}`;
  }

  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    customHeaders?: Record<string, string>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const url = `${this.homeserver}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...customHeaders
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.auth?.accessToken) {
      headers['Authorization'] = `Bearer ${this.auth.accessToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortSignal
    });

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      const errorMsg = errorBody?.error || errorBody?.message || `HTTP ${response.status} ${response.statusText}`;
      const err = new Error(`Matrix API Error (${response.status}): ${errorMsg}`);
      (err as any).data = errorBody;
      (err as any).status = response.status;
      throw err;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Register as a guest account without requiring an email or password
   */
  async registerGuest(displayNickname?: string): Promise<MatrixAuth> {
    let data: any;
    try {
      data = await this.request<any>('/_matrix/client/v3/register?kind=guest', 'POST', {});
    } catch (err: any) {
      if (err.status === 403 || String(err.message).includes('Registration has been disabled')) {
        throw new Error(
          `Serwer ${this.homeserver} ma wyłączoną rejestrację anonimowych gości ze względów antyspamowych. Zaloguj się kontem Matrix (Login + Hasło) lub Tokenem dostępu.`
        );
      }
      throw err;
    }

    this.auth = {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      homeserver: this.homeserver
    };

    if (displayNickname) {
      try {
        await this.setDisplayName(displayNickname);
      } catch (err) {
        console.warn('Could not set guest display name:', err);
      }
    }

    return this.auth;
  }

  /**
   * Register a new full user account with username and password
   */
  async registerUser(username: string, password: string, displayNickname?: string): Promise<MatrixAuth> {
    const registerBody: any = {
      username,
      password,
      auth: {
        type: 'm.login.dummy'
      }
    };

    let data: any;
    try {
      data = await this.request<any>('/_matrix/client/v3/register', 'POST', registerBody);
    } catch (err: any) {
      // If server returned 401 with a session token for UIA (User-Interactive Authentication)
      const session = err.data?.session;
      if (err.status === 401 && session) {
        registerBody.auth.session = session;
        data = await this.request<any>('/_matrix/client/v3/register', 'POST', registerBody);
      } else {
        throw err;
      }
    }

    this.auth = {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      homeserver: this.homeserver
    };

    if (displayNickname) {
      try {
        await this.setDisplayName(displayNickname);
      } catch {}
    }

    return this.auth;
  }

  /**
   * Login with existing username/password
   */
  async loginWithPassword(username: string, password: string): Promise<MatrixAuth> {
    const body = {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: username
      },
      password
    };
    const data = await this.request<any>('/_matrix/client/v3/login', 'POST', body);
    this.auth = {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      homeserver: this.homeserver
    };
    return this.auth;
  }

  /**
   * Login using an existing access token (retrieves userId automatically via whoami)
   */
  async loginWithToken(accessToken: string, customUserId?: string): Promise<MatrixAuth> {
    this.auth = {
      userId: customUserId || '',
      accessToken,
      homeserver: this.homeserver
    };

    if (!customUserId) {
      try {
        const whoami = await this.request<any>('/_matrix/client/v3/account/whoami', 'GET');
        this.auth.userId = whoami.user_id;
        this.auth.deviceId = whoami.device_id;
      } catch (err: any) {
        this.auth = null;
        throw new Error('Nieprawidłowy token Matrix: ' + err.message);
      }
    }

    return this.auth;
  }

  /**
   * Set user display name
   */
  async setDisplayName(name: string): Promise<void> {
    if (!this.auth) throw new Error('Not authenticated');
    const encoded = encodeURIComponent(this.auth.userId);
    await this.request(`/_matrix/client/v3/profile/${encoded}/displayname`, 'PUT', {
      displayname: name
    });
  }

  /**
   * Get user display name
   */
  async getDisplayName(userId: string): Promise<string> {
    const encoded = encodeURIComponent(userId);
    const data = await this.request<any>(`/_matrix/client/v3/profile/${encoded}/displayname`, 'GET');
    return data.displayname ?? userId;
  }

  /**
   * Create a new multiplayer game lobby room
   */
  async createLobbyRoom(options: CreateLobbyOptions): Promise<string> {
    if (!this.auth) throw new Error('Not authenticated');

    const maxPlayers = options.maxPlayers ?? 4;
    const isPublic = options.isPublic ?? true;

    const initial_state: any[] = [
      {
        type: 'm.room.guest_access',
        state_key: '',
        content: { guest_access: 'can_join' }
      },
      {
        type: 'm.room.history_visibility',
        state_key: '',
        content: { history_visibility: 'world_readable' }
      },
      {
        type: 'm.game.lobby',
        state_key: '',
        content: {
          gameId: options.gameId,
          hostUserId: this.auth.userId,
          maxPlayers,
          status: 'waiting',
          metadata: options.metadata || {}
        } as LobbyStateEventContent
      }
    ];

    const body: any = {
      name: options.name,
      topic: options.topic ?? `Game: ${options.gameId}`,
      visibility: isPublic ? 'public' : 'private',
      preset: isPublic ? 'public_chat' : 'private_chat',
      initial_state
    };

    const res = await this.request<any>('/_matrix/client/v3/createRoom', 'POST', body);
    return res.room_id;
  }

  /**
   * Join an existing lobby room
   */
  async joinRoom(roomIdOrAlias: string): Promise<string> {
    if (!this.auth) throw new Error('Not authenticated');
    const encoded = encodeURIComponent(roomIdOrAlias);
    const res = await this.request<any>(`/_matrix/client/v3/join/${encoded}`, 'POST', {});
    return res.room_id;
  }

  /**
   * Leave a lobby room
   */
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.auth) throw new Error('Not authenticated');
    const encoded = encodeURIComponent(roomId);
    await this.request(`/_matrix/client/v3/rooms/${encoded}/leave`, 'POST', {});
  }

  /**
   * Set or update custom state event in a room
   */
  async setRoomState(roomId: string, eventType: string, stateKey: string, content: any): Promise<string> {
    if (!this.auth) throw new Error('Not authenticated');
    const encRoom = encodeURIComponent(roomId);
    const encType = encodeURIComponent(eventType);
    const encKey = encodeURIComponent(stateKey);
    const res = await this.request<any>(
      `/_matrix/client/v3/rooms/${encRoom}/state/${encType}/${encKey}`,
      'PUT',
      content
    );
    return res.event_id;
  }

  /**
   * Get specific room state event
   */
  async getRoomState<T = any>(roomId: string, eventType: string, stateKey = ''): Promise<T> {
    const encRoom = encodeURIComponent(roomId);
    const encType = encodeURIComponent(eventType);
    const encKey = encodeURIComponent(stateKey);
    return this.request<T>(`/_matrix/client/v3/rooms/${encRoom}/state/${encType}/${encKey}`, 'GET');
  }

  /**
   * Send a chat message into the lobby
   */
  async sendChatMessage(roomId: string, text: string): Promise<string> {
    if (!this.auth) throw new Error('Not authenticated');
    const encRoom = encodeURIComponent(roomId);
    const txnId = this.getTxnId();
    const res = await this.request<any>(
      `/_matrix/client/v3/rooms/${encRoom}/send/m.room.message/${txnId}`,
      'PUT',
      {
        msgtype: 'm.text',
        body: text
      }
    );
    return res.event_id;
  }

  /**
   * List public rooms filtered by game identifier
   */
  async listPublicLobbies(gameId?: string, limit = 20): Promise<LobbyInfo[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    const res = await this.request<MatrixPublicRoomsResponse>(`/_matrix/client/v3/publicRooms?${params.toString()}`);
    
    const lobbies: LobbyInfo[] = [];

    for (const room of res.chunk || []) {
      // Check if room topic or name matches gameId or contains game marker
      const matchesGame = !gameId || 
        (room.topic && room.topic.includes(`Game: ${gameId}`)) || 
        (room.name && room.name.toLowerCase().includes(gameId.toLowerCase()));

      if (matchesGame) {
        lobbies.push({
          roomId: room.room_id,
          name: room.name || 'Unnamed Lobby',
          topic: room.topic,
          gameId: gameId || 'generic',
          hostUserId: '',
          numMembers: room.num_joined_members,
          maxPlayers: 8,
          status: 'waiting',
          metadata: {}
        });
      }
    }

    return lobbies;
  }

  /**
   * Start long-polling /sync loop to listen for room events, joins, leaves, and chat
   */
  startSync(timeout = 30000): void {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.syncAbortController = new AbortController();

    const poll = async () => {
      while (this.isSyncing) {
        try {
          const params = new URLSearchParams({
            timeout: timeout.toString(),
            filter: JSON.stringify({
              room: {
                timeline: { limit: 10 }
              }
            })
          });
          if (this.syncToken) {
            params.set('since', this.syncToken);
          }

          const response = await this.request<MatrixSyncResponse>(
            `/_matrix/client/v3/sync?${params.toString()}`,
            'GET',
            undefined,
            undefined,
            this.syncAbortController?.signal
          );

          this.syncToken = response.next_batch;
          this.processSyncResponse(response);
          this.emit('sync', response);
        } catch (err: any) {
          if (err.name === 'AbortError' || !this.isSyncing) {
            break;
          }
          this.emit('error', err);
          // Wait 3 seconds on error before retrying sync
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    };

    poll();
  }

  /**
   * Stop the /sync loop
   */
  stopSync(): void {
    this.isSyncing = false;
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      this.syncAbortController = null;
    }
  }

  /**
   * Internal processing of sync payloads to trigger fine-grained events
   */
  private processSyncResponse(response: MatrixSyncResponse): void {
    const joinedRooms = response.rooms?.join || {};

    for (const [roomId, roomData] of Object.entries(joinedRooms)) {
      // Process state events
      for (const event of roomData.state?.events || []) {
        this.emit('roomState', { roomId, event });

        if (event.type === 'm.game.lobby') {
          this.emit('lobbyStateChange', {
            roomId,
            state: event.content as LobbyStateEventContent
          });
        } else if (event.type === 'm.game.player') {
          this.emit('playerStateChange', {
            roomId,
            userId: event.state_key || event.sender,
            state: event.content as PlayerStateEventContent
          });
        }
      }

      // Process timeline events (chat, dynamic updates)
      for (const event of roomData.timeline?.events || []) {
        if (event.type === 'm.room.message' && event.content?.msgtype === 'm.text') {
          this.emit('roomMessage', {
            roomId,
            message: {
              senderUserId: event.sender,
              senderNickname: event.sender.split(':')[0].replace('@', ''),
              text: event.content.body,
              timestamp: event.origin_server_ts
            }
          });
        } else if (event.type === 'm.game.lobby') {
          this.emit('lobbyStateChange', {
            roomId,
            state: event.content as LobbyStateEventContent
          });
        } else if (event.type === 'm.game.player') {
          this.emit('playerStateChange', {
            roomId,
            userId: event.state_key || event.sender,
            state: event.content as PlayerStateEventContent
          });
        }
      }
    }
  }
}
