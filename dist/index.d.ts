type EventHandler<T = any> = (data: T) => void;
declare class TypedEventEmitter<Events extends Record<string, any>> {
    private listeners;
    on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this;
    off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this;
    once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this;
    emit<K extends keyof Events>(event: K, data: Events[K]): boolean;
    removeAllListeners(event?: keyof Events): this;
    listenerCount(event: keyof Events): number;
}

interface MatrixAuth {
    userId: string;
    accessToken: string;
    deviceId?: string;
    homeserver: string;
}
interface MatrixPublicRoom {
    room_id: string;
    name?: string;
    topic?: string;
    num_joined_members: number;
    world_readable: boolean;
    guest_can_join: boolean;
    avatar_url?: string;
    canonical_alias?: string;
}
interface MatrixPublicRoomsResponse {
    chunk: MatrixPublicRoom[];
    next_batch?: string;
    total_room_count_estimate?: number;
}
interface MatrixEvent {
    type: string;
    sender: string;
    content: Record<string, any>;
    origin_server_ts: number;
    event_id: string;
    state_key?: string;
    room_id?: string;
}
interface MatrixSyncRoomState {
    events: MatrixEvent[];
}
interface MatrixSyncTimeline {
    events: MatrixEvent[];
    limited?: boolean;
    prev_batch?: string;
}
interface MatrixJoinedRoomSync {
    state: MatrixSyncRoomState;
    timeline: MatrixSyncTimeline;
    unread_notifications?: {
        notification_count?: number;
        highlight_count?: number;
    };
}
interface MatrixSyncResponse {
    next_batch: string;
    rooms?: {
        join?: Record<string, MatrixJoinedRoomSync>;
        invite?: Record<string, any>;
        leave?: Record<string, any>;
    };
}
interface CreateLobbyOptions {
    name: string;
    topic?: string;
    gameId: string;
    maxPlayers?: number;
    isPublic?: boolean;
    metadata?: Record<string, any>;
}
interface LobbyStateEventContent {
    gameId: string;
    hostUserId: string;
    hostPeerId?: string;
    maxPlayers: number;
    status: 'waiting' | 'starting' | 'in_game';
    metadata: Record<string, any>;
}
interface PlayerStateEventContent {
    nickname: string;
    peerId?: string;
    isReady: boolean;
    customData?: Record<string, any>;
}
interface LobbyPlayer {
    userId: string;
    peerId?: string;
    nickname: string;
    isReady: boolean;
    isHost: boolean;
    customData?: Record<string, any>;
}
interface LobbyInfo {
    roomId: string;
    name: string;
    topic?: string;
    gameId: string;
    hostUserId: string;
    hostPeerId?: string;
    numMembers: number;
    maxPlayers: number;
    status: 'waiting' | 'starting' | 'in_game';
    metadata: Record<string, any>;
}
interface LobbyChatMessage {
    senderUserId: string;
    senderNickname: string;
    text: string;
    timestamp: number;
}

interface MatrixClientEvents {
    sync: MatrixSyncResponse;
    roomState: {
        roomId: string;
        event: MatrixEvent;
    };
    roomMessage: {
        roomId: string;
        message: LobbyChatMessage;
    };
    playerStateChange: {
        roomId: string;
        userId: string;
        state: PlayerStateEventContent;
    };
    lobbyStateChange: {
        roomId: string;
        state: LobbyStateEventContent;
    };
    error: Error;
}
declare class MatrixClient extends TypedEventEmitter<MatrixClientEvents> {
    private homeserver;
    private auth;
    private syncToken;
    private isSyncing;
    private syncAbortController;
    private txnCounter;
    constructor(homeserver?: string);
    get isAuthenticated(): boolean;
    get currentUserId(): string | null;
    get currentAuth(): MatrixAuth | null;
    setAuth(auth: MatrixAuth): void;
    private getTxnId;
    private request;
    /**
     * Register as a guest account without requiring an email or password
     */
    registerGuest(displayNickname?: string): Promise<MatrixAuth>;
    /**
     * Login with existing username/password
     */
    loginWithPassword(username: string, password: string): Promise<MatrixAuth>;
    /**
     * Set user display name
     */
    setDisplayName(name: string): Promise<void>;
    /**
     * Get user display name
     */
    getDisplayName(userId: string): Promise<string>;
    /**
     * Create a new multiplayer game lobby room
     */
    createLobbyRoom(options: CreateLobbyOptions): Promise<string>;
    /**
     * Join an existing lobby room
     */
    joinRoom(roomIdOrAlias: string): Promise<string>;
    /**
     * Leave a lobby room
     */
    leaveRoom(roomId: string): Promise<void>;
    /**
     * Set or update custom state event in a room
     */
    setRoomState(roomId: string, eventType: string, stateKey: string, content: any): Promise<string>;
    /**
     * Get specific room state event
     */
    getRoomState<T = any>(roomId: string, eventType: string, stateKey?: string): Promise<T>;
    /**
     * Send a chat message into the lobby
     */
    sendChatMessage(roomId: string, text: string): Promise<string>;
    /**
     * List public rooms filtered by game identifier
     */
    listPublicLobbies(gameId?: string, limit?: number): Promise<LobbyInfo[]>;
    /**
     * Start long-polling /sync loop to listen for room events, joins, leaves, and chat
     */
    startSync(timeout?: number): void;
    /**
     * Stop the /sync loop
     */
    stopSync(): void;
    /**
     * Internal processing of sync payloads to trigger fine-grained events
     */
    private processSyncResponse;
}

interface LobbyRoomEvents {
    playerJoined: LobbyPlayer;
    playerLeft: string;
    playerUpdated: LobbyPlayer;
    hostPeerIdAvailable: string;
    gameStarted: {
        hostPeerId?: string;
        metadata: Record<string, any>;
    };
    lobbyUpdated: LobbyStateEventContent;
    chatMessage: LobbyChatMessage;
    error: Error;
}
declare class LobbyRoom extends TypedEventEmitter<LobbyRoomEvents> {
    readonly roomId: string;
    readonly matrix: MatrixClient;
    private _hostUserId;
    private _hostPeerId?;
    private _gameId;
    private _status;
    private _maxPlayers;
    private _metadata;
    private _players;
    private _chatMessages;
    constructor(matrix: MatrixClient, roomId: string, initialState?: Partial<LobbyStateEventContent>);
    get hostUserId(): string;
    get hostPeerId(): string | undefined;
    get isHost(): boolean;
    get status(): 'waiting' | 'starting' | 'in_game';
    get players(): LobbyPlayer[];
    get gameId(): string;
    get maxPlayers(): number;
    get metadata(): Record<string, any>;
    get chatMessages(): LobbyChatMessage[];
    private setupMatrixListeners;
    private updateLobbyState;
    private updatePlayerState;
    /**
     * Set player readiness in the lobby
     */
    setReady(isReady: boolean, customData?: Record<string, any>): Promise<void>;
    /**
     * Set or update this player's PeerJS ID
     */
    setPeerId(peerId: string): Promise<void>;
    /**
     * Set host peer ID (only callable by host)
     */
    setHostPeerId(hostPeerId: string): Promise<void>;
    /**
     * Set custom player properties (e.g. skin, team, color)
     */
    setCustomData(data: Record<string, any>): Promise<void>;
    /**
     * Start the game (host only)
     */
    startGame(): Promise<void>;
    /**
     * Send a chat message into the lobby
     */
    sendChatMessage(text: string): Promise<void>;
    /**
     * Leave this lobby
     */
    leave(): Promise<void>;
}

type NetworkTopology = 'star' | 'mesh';
type ChannelReliability = 'reliable' | 'unreliable';
declare enum PacketType {
    PING = 1,
    PONG = 2,
    HANDSHAKE = 3,
    HANDSHAKE_ACK = 4,
    GAME_JSON = 10,
    GAME_BINARY = 11,
    TURN_ACTION = 20,
    TURN_END = 21,
    LOCKSTEP_COMMAND = 30,
    LOCKSTEP_TICK_ACK = 31,
    REALTIME_SNAPSHOT = 40,
    REALTIME_INPUT = 41,
    SHARED_STATE_SET = 50,
    SHARED_STATE_SYNC = 51
}
interface NetworkPacket<T = any> {
    type: PacketType;
    senderPeerId: string;
    seq?: number;
    timestamp: number;
    data: T;
}
interface PeerConnectionStats {
    peerId: string;
    ping: number;
    lastPingTimestamp: number;
    bytesSent: number;
    bytesReceived: number;
    connectedAt: number;
}
interface PeerManagerOptions {
    peerId?: string;
    topology?: NetworkTopology;
    isHost?: boolean;
    debug?: boolean;
    peerConfig?: any;
    pingIntervalMs?: number;
}

interface PeerManagerEvents {
    ready: string;
    peerConnected: string;
    peerDisconnected: string;
    data: {
        senderPeerId: string;
        packet: NetworkPacket;
        channel: ChannelReliability;
    };
    binary: {
        senderPeerId: string;
        type: PacketType;
        timestamp: number;
        seq: number;
        payload: Uint8Array;
    };
    pingUpdate: {
        peerId: string;
        ping: number;
    };
    error: Error;
}
declare class PeerManager extends TypedEventEmitter<PeerManagerEvents> {
    private peer;
    private myPeerId;
    private connections;
    readonly topology: NetworkTopology;
    readonly isHost: boolean;
    private pingIntervalId;
    private pingIntervalMs;
    private isDestroyed;
    constructor(options?: PeerManagerOptions);
    get peerId(): string | null;
    get isReady(): boolean;
    get connectedPeerIds(): string[];
    getStats(peerId: string): PeerConnectionStats | null;
    getAllStats(): PeerConnectionStats[];
    private initPeer;
    /**
     * Connect to a remote peer with both reliable and unreliable channels
     */
    connectToPeer(remotePeerId: string): void;
    private handleIncomingConnection;
    private setupConnectionEvents;
    private handleIncomingData;
    private cleanupConnection;
    /**
     * Send arbitrary JSON payload to a specific peer
     */
    sendJson(peerId: string, packet: NetworkPacket, channel?: ChannelReliability): boolean;
    /**
     * Send binary data (Uint8Array / ArrayBuffer) to a specific peer (ideal for FPS)
     */
    sendBinary(peerId: string, type: PacketType, payload: Uint8Array, channel?: ChannelReliability): boolean;
    /**
     * Broadcast JSON payload to all connected peers
     */
    broadcastJson(packet: NetworkPacket, channel?: ChannelReliability): void;
    /**
     * Broadcast binary data to all connected peers
     */
    broadcastBinary(type: PacketType, payload: Uint8Array, channel?: ChannelReliability): void;
    /**
     * Send periodic PING to measure RTT latency
     */
    private startPingLoop;
    destroy(): void;
}

interface EntitySnapshot<T = any> {
    id: string | number;
    timestamp: number;
    state: T;
}
interface RealtimeEngineOptions {
    peerManager: PeerManager;
    tickRate?: number;
    interpolationDelayMs?: number;
    isHost?: boolean;
}
interface Vector2State {
    entityId: number;
    x: number;
    y: number;
    angle: number;
    timestamp: number;
}
interface Vector3State {
    entityId: number;
    x: number;
    y: number;
    z: number;
    rotY: number;
    timestamp: number;
}
interface RealtimeEngineEvents {
    entityUpdate: {
        entityId: string | number;
        state: any;
        senderPeerId: string;
    };
    vector2Update: Vector2State & {
        senderPeerId: string;
    };
    vector3Update: Vector3State & {
        senderPeerId: string;
    };
    tick: number;
}
declare class RealtimeEngine extends TypedEventEmitter<RealtimeEngineEvents> {
    readonly peerManager: PeerManager;
    readonly tickRate: number;
    readonly interpolationDelayMs: number;
    readonly isHost: boolean;
    private localEntities;
    private remoteEntityHistory;
    private tickIntervalId;
    private currentTick;
    constructor(options: RealtimeEngineOptions);
    private setupListeners;
    private recordSnapshot;
    /**
     * Register or update a local entity's state (e.g. local player)
     */
    setLocalEntity(entityId: string | number, state: any): void;
    /**
     * Send 3D coordinates (position X, Y, Z + rotation Y) via ultra-fast binary packet
     * Total payload: only 18 bytes! Ideal for FPS / 3D games.
     */
    sendVector3(entityId: number, x: number, y: number, z: number, rotY: number): void;
    /**
     * Send 2D coordinates (position X, Y + angle) via ultra-fast binary packet
     * Total payload: only 14 bytes! Ideal for 2D arena / top-down shooters.
     */
    sendVector2(entityId: number, x: number, y: number, angle: number): void;
    /**
     * Send arbitrary JSON state for an entity over unreliable UDP WebRTC channel
     */
    broadcastEntityState(entityId: string | number, state: any): void;
    /**
     * Get interpolated state for smooth rendering (eliminates jitter and stutter)
     */
    getInterpolatedPosition(entityId: string | number, customRenderTime?: number): {
        x: number;
        y: number;
        z?: number;
    } | null;
    private startTickLoop;
    destroy(): void;
}

interface LockstepCommand<T = any> {
    playerId: string;
    action: string;
    payload: T;
    targetTick: number;
}
interface LockstepEngineOptions {
    peerManager: PeerManager;
    tickDurationMs?: number;
    commandDelayTicks?: number;
    playerIds?: string[];
}
interface LockstepEngineEvents {
    tickExecute: {
        tick: number;
        commands: LockstepCommand[];
    };
    lagPause: {
        tick: number;
        waitingForPeerId: string;
    };
    lagResume: {
        tick: number;
    };
}
declare class LockstepEngine extends TypedEventEmitter<LockstepEngineEvents> {
    readonly peerManager: PeerManager;
    readonly tickDurationMs: number;
    readonly commandDelayTicks: number;
    private currentTick;
    private isRunning;
    private isPausedForLag;
    private tickTimer;
    private scheduledCommands;
    private tickPeerReceipts;
    private knownPeers;
    constructor(options: LockstepEngineOptions);
    private setupListeners;
    /**
     * Queue a gameplay command for the next executable tick (e.g. move army, build unit)
     */
    queueCommand<T = any>(action: string, payload: T): LockstepCommand<T>;
    private registerRemoteCommand;
    private registerTickAck;
    private canAdvanceTick;
    /**
     * Start the deterministic lockstep simulation loop
     */
    start(): void;
    private advanceTick;
    /**
     * Pause the simulation
     */
    pause(): void;
    destroy(): void;
}

interface TurnAction<T = any> {
    playerId: string;
    action: string;
    payload: T;
    turnNumber: number;
    timestamp: number;
}
interface TurnBasedEngineOptions {
    peerManager: PeerManager;
    playersOrder: string[];
    turnTimeoutMs?: number;
    initialTurnNumber?: number;
}
interface TurnBasedEngineEvents {
    turnChange: {
        activePlayerId: string;
        turnNumber: number;
        remainingTimeMs?: number;
    };
    action: TurnAction;
    turnTimeout: {
        timedOutPlayerId: string;
        turnNumber: number;
    };
}
declare class TurnBasedEngine extends TypedEventEmitter<TurnBasedEngineEvents> {
    readonly peerManager: PeerManager;
    private playersOrder;
    private currentTurnIndex;
    private turnNumber;
    private turnTimeoutMs?;
    private timerId;
    private history;
    constructor(options: TurnBasedEngineOptions);
    get activePlayerId(): string;
    get currentTurnNumber(): number;
    get isMyTurn(): boolean;
    get actionHistory(): TurnAction[];
    private setupListeners;
    /**
     * Start the turn loop (initiates timer for the first player)
     */
    start(): void;
    /**
     * Submit an action during the active turn
     */
    submitAction<T = any>(action: string, payload: T): TurnAction<T>;
    /**
     * End the current player's turn and pass to the next player
     */
    passTurn(): void;
    private advanceTurnInternal;
    private resetTimer;
    destroy(): void;
}

interface StateChangeOperation {
    key: string;
    type: 'set' | 'push' | 'delete';
    value?: any;
    version: number;
    authorPeerId: string;
}
interface SharedStateOptions {
    peerManager: PeerManager;
    initialState?: Record<string, any>;
    isHost?: boolean;
}
interface SharedStateEvents {
    change: {
        key: string;
        value: any;
        authorPeerId: string;
    };
    sync: Record<string, any>;
}
declare class SharedStateEngine extends TypedEventEmitter<SharedStateEvents> {
    readonly peerManager: PeerManager;
    readonly isHost: boolean;
    private state;
    private keyVersions;
    private keySubscribers;
    constructor(options: SharedStateOptions);
    private setupListeners;
    /**
     * Set a key-value pair and broadcast to all peers
     */
    set<T = any>(key: string, value: T): void;
    /**
     * Push an item into an array state value (e.g. canvas strokes, logs)
     */
    push<T = any>(key: string, item: T): void;
    /**
     * Get value by key
     */
    get<T = any>(key: string, defaultValue?: T): T;
    /**
     * Get entire state snapshot
     */
    getState(): Record<string, any>;
    /**
     * Subscribe to changes on a specific key
     */
    subscribe<T = any>(key: string, callback: (value: T, authorPeerId: string) => void): () => void;
    private applyOperation;
    private applyFullSync;
    destroy(): void;
}

interface GameNetClientOptions {
    homeserver?: string;
    gameId?: string;
    peerConfig?: any;
}
interface GameNetClientEvents {
    authenticated: MatrixAuth;
    lobbyJoined: LobbyRoom;
    peerConnected: string;
    peerDisconnected: string;
    gameData: {
        senderPeerId: string;
        data: any;
        channel: ChannelReliability;
    };
    gameBinary: {
        senderPeerId: string;
        type: PacketType;
        payload: Uint8Array;
        timestamp: number;
        seq: number;
    };
    pingUpdate: {
        peerId: string;
        ping: number;
    };
    error: Error;
}
declare class GameNetClient extends TypedEventEmitter<GameNetClientEvents> {
    readonly matrix: MatrixClient;
    readonly gameId: string;
    readonly peerConfig?: any;
    private currentLobby;
    private peerManager;
    constructor(options?: GameNetClientOptions);
    get lobby(): LobbyRoom | null;
    get peer(): PeerManager | null;
    get isHost(): boolean;
    get myPeerId(): string | null;
    get currentUserId(): string | null;
    private setupMatrixEvents;
    /**
     * Register as a guest without requiring an account or email
     */
    loginAsGuest(nickname?: string): Promise<MatrixAuth>;
    /**
     * Log in using existing Matrix account
     */
    loginWithPassword(username: string, password: string): Promise<MatrixAuth>;
    /**
     * Restore existing session with token
     */
    restoreSession(auth: MatrixAuth): void;
    /**
     * List available public game lobbies for this game
     */
    listLobbies(limit?: number): Promise<LobbyInfo[]>;
    /**
     * Create a new multiplayer game lobby
     */
    createLobby(options: {
        name: string;
        topic?: string;
        maxPlayers?: number;
        isPublic?: boolean;
        metadata?: Record<string, any>;
    }): Promise<LobbyRoom>;
    /**
     * Join an existing lobby room by its Matrix room ID or alias
     */
    joinLobby(roomIdOrAlias: string): Promise<LobbyRoom>;
    private initPeerNetwork;
    /**
     * Broadcast arbitrary game data to all connected players via WebRTC
     */
    broadcast(data: any, channel?: ChannelReliability): void;
    /**
     * Send game data to a specific peer via WebRTC
     */
    sendTo(peerId: string, data: any, channel?: ChannelReliability): boolean;
    /**
     * Create RealtimeEngine (ideal for FPS, fast 2D/3D action, racers)
     */
    createRealtimeEngine(options?: Partial<RealtimeEngineOptions>): RealtimeEngine;
    /**
     * Create LockstepEngine (ideal for RTS, fighting games, deterministic simulations)
     */
    createLockstepEngine(options?: Partial<LockstepEngineOptions>): LockstepEngine;
    /**
     * Create TurnBasedEngine (ideal for board, card, chess, turn-based games)
     */
    createTurnBasedEngine(options: Omit<TurnBasedEngineOptions, 'peerManager'>): TurnBasedEngine;
    /**
     * Create SharedStateEngine (ideal for whiteboard, kalambury, clickers, party games)
     */
    createSharedState(options?: Partial<SharedStateOptions>): SharedStateEngine;
    /**
     * Leave the current game lobby and clean up network connections
     */
    leave(): Promise<void>;
    /**
     * Disconnect completely
     */
    destroy(): void;
}

interface LobbySearchOptions {
    gameId: string;
    limit?: number;
    includeInGame?: boolean;
}
declare class LobbyDiscovery {
    static searchLobbies(client: MatrixClient, options: LobbySearchOptions): Promise<LobbyInfo[]>;
}

declare class PacketSerializer {
    private static seqCounter;
    static nextSeq(): number;
    /**
     * Wrap payload into a typed NetworkPacket object for JSON transmission
     */
    static createJsonPacket<T = any>(type: PacketType, senderPeerId: string, data: T): NetworkPacket<T>;
    /**
     * Create a binary packet with header (for FPS / real-time high frequency streaming)
     */
    static createBinaryPacket(type: PacketType, payload: Uint8Array): Uint8Array;
    /**
     * Parse a received binary packet
     */
    static parseBinaryPacket(buffer: ArrayBuffer | Uint8Array): {
        type: PacketType;
        timestamp: number;
        seq: number;
        payload: Uint8Array;
    } | null;
    /**
     * Fast Vector3 pack for FPS (position X, Y, Z + rotation Y + entityId)
     * Total size: 2 (entityId) + 4*3 (coords) + 4 (rot) = 18 bytes!
     */
    static packVector3(entityId: number, x: number, y: number, z: number, rotY: number): Uint8Array;
    /**
     * Fast Vector3 unpack for FPS
     */
    static unpackVector3(buffer: ArrayBuffer | Uint8Array): {
        entityId: number;
        x: number;
        y: number;
        z: number;
        rotY: number;
    };
    /**
     * Fast Vector2 pack for 2D Arena/Shooter (position X, Y + angle + entityId)
     * Total size: 2 (entityId) + 4*2 (coords) + 4 (angle) = 14 bytes!
     */
    static packVector2(entityId: number, x: number, y: number, angle: number): Uint8Array;
    /**
     * Fast Vector2 unpack for 2D Arena/Shooter
     */
    static unpackVector2(buffer: ArrayBuffer | Uint8Array): {
        entityId: number;
        x: number;
        y: number;
        angle: number;
    };
}

declare const MatrixPeerGame: {
    Client: typeof GameNetClient;
    GameNetClient: typeof GameNetClient;
    MatrixClient: typeof MatrixClient;
    LobbyRoom: typeof LobbyRoom;
    LobbyDiscovery: typeof LobbyDiscovery;
    PeerManager: typeof PeerManager;
    PacketSerializer: typeof PacketSerializer;
    PacketType: typeof PacketType;
    RealtimeEngine: typeof RealtimeEngine;
    LockstepEngine: typeof LockstepEngine;
    TurnBasedEngine: typeof TurnBasedEngine;
    SharedStateEngine: typeof SharedStateEngine;
};

export { type ChannelReliability, type CreateLobbyOptions, type EntitySnapshot, type EventHandler, GameNetClient, type GameNetClientEvents, type GameNetClientOptions, type LobbyChatMessage, LobbyDiscovery, type LobbyInfo, type LobbyPlayer, LobbyRoom, type LobbyRoomEvents, type LobbySearchOptions, type LobbyStateEventContent, type LockstepCommand, LockstepEngine, type LockstepEngineEvents, type LockstepEngineOptions, type MatrixAuth, MatrixClient, type MatrixClientEvents, type MatrixEvent, type MatrixJoinedRoomSync, type MatrixPublicRoom, type MatrixPublicRoomsResponse, type MatrixSyncResponse, type MatrixSyncRoomState, type MatrixSyncTimeline, type NetworkPacket, type NetworkTopology, PacketSerializer, PacketType, type PeerConnectionStats, PeerManager, type PeerManagerEvents, type PeerManagerOptions, type PlayerStateEventContent, RealtimeEngine, type RealtimeEngineEvents, type RealtimeEngineOptions, SharedStateEngine, type SharedStateEvents, type SharedStateOptions, type StateChangeOperation, type TurnAction, TurnBasedEngine, type TurnBasedEngineEvents, type TurnBasedEngineOptions, TypedEventEmitter, type Vector2State, type Vector3State, MatrixPeerGame as default };
