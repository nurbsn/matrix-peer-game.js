"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Client: () => GameNetClient,
  GameNetClient: () => GameNetClient,
  LobbyDiscovery: () => LobbyDiscovery,
  LobbyRoom: () => LobbyRoom,
  LockstepEngine: () => LockstepEngine,
  MatrixClient: () => MatrixClient,
  PacketSerializer: () => PacketSerializer,
  PacketType: () => PacketType,
  PeerManager: () => PeerManager,
  RealtimeEngine: () => RealtimeEngine,
  SharedStateEngine: () => SharedStateEngine,
  TurnBasedEngine: () => TurnBasedEngine,
  TypedEventEmitter: () => TypedEventEmitter,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/core/events.ts
var TypedEventEmitter = class {
  listeners = {};
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = /* @__PURE__ */ new Set();
    }
    this.listeners[event].add(handler);
    return this;
  }
  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].delete(handler);
      if (this.listeners[event].size === 0) {
        delete this.listeners[event];
      }
    }
    return this;
  }
  once(event, handler) {
    const onceWrapper = (data) => {
      this.off(event, onceWrapper);
      handler(data);
    };
    this.on(event, onceWrapper);
    return this;
  }
  emit(event, data) {
    const handlers = this.listeners[event];
    if (!handlers || handlers.size === 0) {
      return false;
    }
    for (const handler of Array.from(handlers)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for "${String(event)}":`, err);
      }
    }
    return true;
  }
  removeAllListeners(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }
  listenerCount(event) {
    return this.listeners[event]?.size ?? 0;
  }
};

// src/matrix/MatrixClient.ts
var MatrixClient = class extends TypedEventEmitter {
  homeserver;
  auth = null;
  syncToken = null;
  isSyncing = false;
  syncAbortController = null;
  txnCounter = 0;
  constructor(homeserver = "https://matrix.org") {
    super();
    this.homeserver = homeserver.replace(/\/+$/, "");
  }
  get isAuthenticated() {
    return this.auth !== null;
  }
  get currentUserId() {
    return this.auth?.userId ?? null;
  }
  get currentAuth() {
    return this.auth;
  }
  setAuth(auth) {
    this.auth = auth;
    this.homeserver = auth.homeserver.replace(/\/+$/, "");
  }
  getTxnId() {
    return `m_${Date.now()}_${++this.txnCounter}`;
  }
  async request(endpoint, method = "GET", body, customHeaders, abortSignal) {
    const url = `${this.homeserver}${endpoint}`;
    const headers = {
      "Accept": "application/json",
      ...customHeaders
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    if (this.auth?.accessToken) {
      headers["Authorization"] = `Bearer ${this.auth.accessToken}`;
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: abortSignal
    });
    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      const errorMsg = errorBody?.error || errorBody?.message || `HTTP ${response.status} ${response.statusText}`;
      const err = new Error(`Matrix API Error (${response.status}): ${errorMsg}`);
      err.data = errorBody;
      err.status = response.status;
      throw err;
    }
    return response.json();
  }
  /**
   * Register as a guest account without requiring an email or password
   */
  async registerGuest(displayNickname) {
    const data = await this.request("/_matrix/client/v3/register?kind=guest", "POST", {});
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
        console.warn("Could not set guest display name:", err);
      }
    }
    return this.auth;
  }
  /**
   * Login with existing username/password
   */
  async loginWithPassword(username, password) {
    const body = {
      type: "m.login.password",
      identifier: {
        type: "m.id.user",
        user: username
      },
      password
    };
    const data = await this.request("/_matrix/client/v3/login", "POST", body);
    this.auth = {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      homeserver: this.homeserver
    };
    return this.auth;
  }
  /**
   * Set user display name
   */
  async setDisplayName(name) {
    if (!this.auth) throw new Error("Not authenticated");
    const encoded = encodeURIComponent(this.auth.userId);
    await this.request(`/_matrix/client/v3/profile/${encoded}/displayname`, "PUT", {
      displayname: name
    });
  }
  /**
   * Get user display name
   */
  async getDisplayName(userId) {
    const encoded = encodeURIComponent(userId);
    const data = await this.request(`/_matrix/client/v3/profile/${encoded}/displayname`, "GET");
    return data.displayname ?? userId;
  }
  /**
   * Create a new multiplayer game lobby room
   */
  async createLobbyRoom(options) {
    if (!this.auth) throw new Error("Not authenticated");
    const maxPlayers = options.maxPlayers ?? 4;
    const isPublic = options.isPublic ?? true;
    const initial_state = [
      {
        type: "m.room.guest_access",
        state_key: "",
        content: { guest_access: "can_join" }
      },
      {
        type: "m.room.history_visibility",
        state_key: "",
        content: { history_visibility: "world_readable" }
      },
      {
        type: "m.game.lobby",
        state_key: "",
        content: {
          gameId: options.gameId,
          hostUserId: this.auth.userId,
          maxPlayers,
          status: "waiting",
          metadata: options.metadata || {}
        }
      }
    ];
    const body = {
      name: options.name,
      topic: options.topic ?? `Game: ${options.gameId}`,
      visibility: isPublic ? "public" : "private",
      preset: isPublic ? "public_chat" : "private_chat",
      initial_state
    };
    const res = await this.request("/_matrix/client/v3/createRoom", "POST", body);
    return res.room_id;
  }
  /**
   * Join an existing lobby room
   */
  async joinRoom(roomIdOrAlias) {
    if (!this.auth) throw new Error("Not authenticated");
    const encoded = encodeURIComponent(roomIdOrAlias);
    const res = await this.request(`/_matrix/client/v3/join/${encoded}`, "POST", {});
    return res.room_id;
  }
  /**
   * Leave a lobby room
   */
  async leaveRoom(roomId) {
    if (!this.auth) throw new Error("Not authenticated");
    const encoded = encodeURIComponent(roomId);
    await this.request(`/_matrix/client/v3/rooms/${encoded}/leave`, "POST", {});
  }
  /**
   * Set or update custom state event in a room
   */
  async setRoomState(roomId, eventType, stateKey, content) {
    if (!this.auth) throw new Error("Not authenticated");
    const encRoom = encodeURIComponent(roomId);
    const encType = encodeURIComponent(eventType);
    const encKey = encodeURIComponent(stateKey);
    const res = await this.request(
      `/_matrix/client/v3/rooms/${encRoom}/state/${encType}/${encKey}`,
      "PUT",
      content
    );
    return res.event_id;
  }
  /**
   * Get specific room state event
   */
  async getRoomState(roomId, eventType, stateKey = "") {
    const encRoom = encodeURIComponent(roomId);
    const encType = encodeURIComponent(eventType);
    const encKey = encodeURIComponent(stateKey);
    return this.request(`/_matrix/client/v3/rooms/${encRoom}/state/${encType}/${encKey}`, "GET");
  }
  /**
   * Send a chat message into the lobby
   */
  async sendChatMessage(roomId, text) {
    if (!this.auth) throw new Error("Not authenticated");
    const encRoom = encodeURIComponent(roomId);
    const txnId = this.getTxnId();
    const res = await this.request(
      `/_matrix/client/v3/rooms/${encRoom}/send/m.room.message/${txnId}`,
      "PUT",
      {
        msgtype: "m.text",
        body: text
      }
    );
    return res.event_id;
  }
  /**
   * List public rooms filtered by game identifier
   */
  async listPublicLobbies(gameId, limit = 20) {
    const params = new URLSearchParams({ limit: limit.toString() });
    const res = await this.request(`/_matrix/client/v3/publicRooms?${params.toString()}`);
    const lobbies = [];
    for (const room of res.chunk || []) {
      const matchesGame = !gameId || room.topic && room.topic.includes(`Game: ${gameId}`) || room.name && room.name.toLowerCase().includes(gameId.toLowerCase());
      if (matchesGame) {
        lobbies.push({
          roomId: room.room_id,
          name: room.name || "Unnamed Lobby",
          topic: room.topic,
          gameId: gameId || "generic",
          hostUserId: "",
          numMembers: room.num_joined_members,
          maxPlayers: 8,
          status: "waiting",
          metadata: {}
        });
      }
    }
    return lobbies;
  }
  /**
   * Start long-polling /sync loop to listen for room events, joins, leaves, and chat
   */
  startSync(timeout = 3e4) {
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
            params.set("since", this.syncToken);
          }
          const response = await this.request(
            `/_matrix/client/v3/sync?${params.toString()}`,
            "GET",
            void 0,
            void 0,
            this.syncAbortController?.signal
          );
          this.syncToken = response.next_batch;
          this.processSyncResponse(response);
          this.emit("sync", response);
        } catch (err) {
          if (err.name === "AbortError" || !this.isSyncing) {
            break;
          }
          this.emit("error", err);
          await new Promise((r) => setTimeout(r, 3e3));
        }
      }
    };
    poll();
  }
  /**
   * Stop the /sync loop
   */
  stopSync() {
    this.isSyncing = false;
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      this.syncAbortController = null;
    }
  }
  /**
   * Internal processing of sync payloads to trigger fine-grained events
   */
  processSyncResponse(response) {
    const joinedRooms = response.rooms?.join || {};
    for (const [roomId, roomData] of Object.entries(joinedRooms)) {
      for (const event of roomData.state?.events || []) {
        this.emit("roomState", { roomId, event });
        if (event.type === "m.game.lobby") {
          this.emit("lobbyStateChange", {
            roomId,
            state: event.content
          });
        } else if (event.type === "m.game.player") {
          this.emit("playerStateChange", {
            roomId,
            userId: event.state_key || event.sender,
            state: event.content
          });
        }
      }
      for (const event of roomData.timeline?.events || []) {
        if (event.type === "m.room.message" && event.content?.msgtype === "m.text") {
          this.emit("roomMessage", {
            roomId,
            message: {
              senderUserId: event.sender,
              senderNickname: event.sender.split(":")[0].replace("@", ""),
              text: event.content.body,
              timestamp: event.origin_server_ts
            }
          });
        } else if (event.type === "m.game.lobby") {
          this.emit("lobbyStateChange", {
            roomId,
            state: event.content
          });
        } else if (event.type === "m.game.player") {
          this.emit("playerStateChange", {
            roomId,
            userId: event.state_key || event.sender,
            state: event.content
          });
        }
      }
    }
  }
};

// src/lobby/LobbyRoom.ts
var LobbyRoom = class extends TypedEventEmitter {
  roomId;
  matrix;
  _hostUserId;
  _hostPeerId;
  _gameId;
  _status = "waiting";
  _maxPlayers;
  _metadata = {};
  _players = /* @__PURE__ */ new Map();
  _chatMessages = [];
  constructor(matrix, roomId, initialState) {
    super();
    this.matrix = matrix;
    this.roomId = roomId;
    this._hostUserId = initialState?.hostUserId || matrix.currentUserId || "";
    this._hostPeerId = initialState?.hostPeerId;
    this._gameId = initialState?.gameId || "generic";
    this._maxPlayers = initialState?.maxPlayers || 4;
    this._metadata = initialState?.metadata || {};
    this._status = initialState?.status || "waiting";
    this.setupMatrixListeners();
  }
  get hostUserId() {
    return this._hostUserId;
  }
  get hostPeerId() {
    return this._hostPeerId;
  }
  get isHost() {
    return this.matrix.currentUserId === this._hostUserId;
  }
  get status() {
    return this._status;
  }
  get players() {
    return Array.from(this._players.values());
  }
  get gameId() {
    return this._gameId;
  }
  get maxPlayers() {
    return this._maxPlayers;
  }
  get metadata() {
    return this._metadata;
  }
  get chatMessages() {
    return [...this._chatMessages];
  }
  setupMatrixListeners() {
    this.matrix.on("roomMessage", ({ roomId, message }) => {
      if (roomId !== this.roomId) return;
      this._chatMessages.push(message);
      this.emit("chatMessage", message);
    });
    this.matrix.on("lobbyStateChange", ({ roomId, state }) => {
      if (roomId !== this.roomId) return;
      this.updateLobbyState(state);
    });
    this.matrix.on("playerStateChange", ({ roomId, userId, state }) => {
      if (roomId !== this.roomId) return;
      this.updatePlayerState(userId, state);
    });
  }
  updateLobbyState(state) {
    const prevStatus = this._status;
    const prevHostPeerId = this._hostPeerId;
    this._hostUserId = state.hostUserId;
    this._hostPeerId = state.hostPeerId;
    this._status = state.status;
    this._maxPlayers = state.maxPlayers;
    this._metadata = state.metadata || {};
    if (state.hostPeerId && state.hostPeerId !== prevHostPeerId) {
      this.emit("hostPeerIdAvailable", state.hostPeerId);
    }
    if (state.status === "in_game" && prevStatus !== "in_game") {
      this.emit("gameStarted", {
        hostPeerId: this._hostPeerId,
        metadata: this._metadata
      });
    }
    this.emit("lobbyUpdated", state);
  }
  updatePlayerState(userId, state) {
    const isNew = !this._players.has(userId);
    const player = {
      userId,
      nickname: state.nickname || userId.split(":")[0].replace("@", ""),
      peerId: state.peerId,
      isReady: state.isReady ?? false,
      isHost: userId === this._hostUserId,
      customData: state.customData
    };
    this._players.set(userId, player);
    if (isNew) {
      this.emit("playerJoined", player);
    } else {
      this.emit("playerUpdated", player);
    }
  }
  /**
   * Set player readiness in the lobby
   */
  async setReady(isReady, customData) {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error("Not authenticated");
    const existing = this._players.get(userId);
    const content = {
      nickname: existing?.nickname || userId.split(":")[0].replace("@", ""),
      peerId: existing?.peerId,
      isReady,
      customData: customData ?? existing?.customData
    };
    await this.matrix.setRoomState(this.roomId, "m.game.player", userId, content);
    this.updatePlayerState(userId, content);
  }
  /**
   * Set or update this player's PeerJS ID
   */
  async setPeerId(peerId) {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error("Not authenticated");
    const existing = this._players.get(userId);
    const content = {
      nickname: existing?.nickname || userId.split(":")[0].replace("@", ""),
      peerId,
      isReady: existing?.isReady ?? false,
      customData: existing?.customData
    };
    await this.matrix.setRoomState(this.roomId, "m.game.player", userId, content);
    this.updatePlayerState(userId, content);
    if (this.isHost) {
      await this.setHostPeerId(peerId);
    }
  }
  /**
   * Set host peer ID (only callable by host)
   */
  async setHostPeerId(hostPeerId) {
    if (!this.isHost) throw new Error("Only the host can set hostPeerId");
    this._hostPeerId = hostPeerId;
    const content = {
      gameId: this._gameId,
      hostUserId: this._hostUserId,
      hostPeerId,
      maxPlayers: this._maxPlayers,
      status: this._status,
      metadata: this._metadata
    };
    await this.matrix.setRoomState(this.roomId, "m.game.lobby", "", content);
  }
  /**
   * Set custom player properties (e.g. skin, team, color)
   */
  async setCustomData(data) {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error("Not authenticated");
    const existing = this._players.get(userId);
    const content = {
      nickname: existing?.nickname || userId.split(":")[0].replace("@", ""),
      peerId: existing?.peerId,
      isReady: existing?.isReady ?? false,
      customData: { ...existing?.customData || {}, ...data }
    };
    await this.matrix.setRoomState(this.roomId, "m.game.player", userId, content);
    this.updatePlayerState(userId, content);
  }
  /**
   * Start the game (host only)
   */
  async startGame() {
    if (!this.isHost) throw new Error("Only the host can start the game");
    this._status = "in_game";
    const content = {
      gameId: this._gameId,
      hostUserId: this._hostUserId,
      hostPeerId: this._hostPeerId,
      maxPlayers: this._maxPlayers,
      status: "in_game",
      metadata: this._metadata
    };
    await this.matrix.setRoomState(this.roomId, "m.game.lobby", "", content);
    this.emit("gameStarted", { hostPeerId: this._hostPeerId, metadata: this._metadata });
  }
  /**
   * Send a chat message into the lobby
   */
  async sendChatMessage(text) {
    await this.matrix.sendChatMessage(this.roomId, text);
  }
  /**
   * Leave this lobby
   */
  async leave() {
    await this.matrix.leaveRoom(this.roomId);
    this._players.clear();
    this.removeAllListeners();
  }
};

// src/lobby/LobbyDiscovery.ts
var LobbyDiscovery = class {
  static async searchLobbies(client, options) {
    const rawRooms = await client.listPublicLobbies(options.gameId, options.limit || 30);
    return rawRooms.filter((room) => {
      if (!options.includeInGame && room.status === "in_game") {
        return false;
      }
      return true;
    });
  }
};

// src/peer/PeerManager.ts
var import_peerjs = require("peerjs");

// src/peer/types.ts
var PacketType = /* @__PURE__ */ ((PacketType2) => {
  PacketType2[PacketType2["PING"] = 1] = "PING";
  PacketType2[PacketType2["PONG"] = 2] = "PONG";
  PacketType2[PacketType2["HANDSHAKE"] = 3] = "HANDSHAKE";
  PacketType2[PacketType2["HANDSHAKE_ACK"] = 4] = "HANDSHAKE_ACK";
  PacketType2[PacketType2["GAME_JSON"] = 10] = "GAME_JSON";
  PacketType2[PacketType2["GAME_BINARY"] = 11] = "GAME_BINARY";
  PacketType2[PacketType2["TURN_ACTION"] = 20] = "TURN_ACTION";
  PacketType2[PacketType2["TURN_END"] = 21] = "TURN_END";
  PacketType2[PacketType2["LOCKSTEP_COMMAND"] = 30] = "LOCKSTEP_COMMAND";
  PacketType2[PacketType2["LOCKSTEP_TICK_ACK"] = 31] = "LOCKSTEP_TICK_ACK";
  PacketType2[PacketType2["REALTIME_SNAPSHOT"] = 40] = "REALTIME_SNAPSHOT";
  PacketType2[PacketType2["REALTIME_INPUT"] = 41] = "REALTIME_INPUT";
  PacketType2[PacketType2["SHARED_STATE_SET"] = 50] = "SHARED_STATE_SET";
  PacketType2[PacketType2["SHARED_STATE_SYNC"] = 51] = "SHARED_STATE_SYNC";
  return PacketType2;
})(PacketType || {});

// src/peer/packet.ts
var BINARY_MAGIC = 170;
var BINARY_HEADER_SIZE = 8;
var PacketSerializer = class {
  static seqCounter = 0;
  static nextSeq() {
    this.seqCounter = this.seqCounter + 1 & 65535;
    return this.seqCounter;
  }
  /**
   * Wrap payload into a typed NetworkPacket object for JSON transmission
   */
  static createJsonPacket(type, senderPeerId, data) {
    return {
      type,
      senderPeerId,
      seq: this.nextSeq(),
      timestamp: Date.now(),
      data
    };
  }
  /**
   * Create a binary packet with header (for FPS / real-time high frequency streaming)
   */
  static createBinaryPacket(type, payload) {
    const totalSize = BINARY_HEADER_SIZE + payload.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    view.setUint8(0, BINARY_MAGIC);
    view.setUint8(1, type);
    view.setUint32(2, Date.now() & 4294967295, true);
    view.setUint16(6, this.nextSeq(), true);
    bytes.set(payload, BINARY_HEADER_SIZE);
    return bytes;
  }
  /**
   * Parse a received binary packet
   */
  static parseBinaryPacket(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength < BINARY_HEADER_SIZE) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint8(0);
    if (magic !== BINARY_MAGIC) return null;
    const type = view.getUint8(1);
    const timestamp = view.getUint32(2, true);
    const seq = view.getUint16(6, true);
    const payload = bytes.subarray(BINARY_HEADER_SIZE);
    return { type, timestamp, seq, payload };
  }
  /**
   * Fast Vector3 pack for FPS (position X, Y, Z + rotation Y + entityId)
   * Total size: 2 (entityId) + 4*3 (coords) + 4 (rot) = 18 bytes!
   */
  static packVector3(entityId, x, y, z, rotY) {
    const buffer = new ArrayBuffer(18);
    const view = new DataView(buffer);
    view.setUint16(0, entityId, true);
    view.setFloat32(2, x, true);
    view.setFloat32(6, y, true);
    view.setFloat32(10, z, true);
    view.setFloat32(14, rotY, true);
    return new Uint8Array(buffer);
  }
  /**
   * Fast Vector3 unpack for FPS
   */
  static unpackVector3(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      entityId: view.getUint16(0, true),
      x: view.getFloat32(2, true),
      y: view.getFloat32(6, true),
      z: view.getFloat32(10, true),
      rotY: view.getFloat32(14, true)
    };
  }
  /**
   * Fast Vector2 pack for 2D Arena/Shooter (position X, Y + angle + entityId)
   * Total size: 2 (entityId) + 4*2 (coords) + 4 (angle) = 14 bytes!
   */
  static packVector2(entityId, x, y, angle) {
    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);
    view.setUint16(0, entityId, true);
    view.setFloat32(2, x, true);
    view.setFloat32(6, y, true);
    view.setFloat32(10, angle, true);
    return new Uint8Array(buffer);
  }
  /**
   * Fast Vector2 unpack for 2D Arena/Shooter
   */
  static unpackVector2(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      entityId: view.getUint16(0, true),
      x: view.getFloat32(2, true),
      y: view.getFloat32(6, true),
      angle: view.getFloat32(10, true)
    };
  }
};

// src/peer/PeerManager.ts
var PeerManager = class extends TypedEventEmitter {
  peer = null;
  myPeerId = null;
  connections = /* @__PURE__ */ new Map();
  topology;
  isHost;
  pingIntervalId = null;
  pingIntervalMs;
  isDestroyed = false;
  constructor(options = {}) {
    super();
    this.topology = options.topology ?? "star";
    this.isHost = options.isHost ?? false;
    this.pingIntervalMs = options.pingIntervalMs ?? 2e3;
    this.initPeer(options);
  }
  get peerId() {
    return this.myPeerId;
  }
  get isReady() {
    return this.peer !== null && this.myPeerId !== null && !this.peer.destroyed;
  }
  get connectedPeerIds() {
    return Array.from(this.connections.keys());
  }
  getStats(peerId) {
    return this.connections.get(peerId)?.stats ?? null;
  }
  getAllStats() {
    return Array.from(this.connections.values()).map((p) => p.stats);
  }
  initPeer(options) {
    const PeerClass = typeof window !== "undefined" && window.Peer ? window.Peer : import_peerjs.Peer;
    const peerId = options.peerId;
    const config = options.peerConfig || {
      debug: options.debug ? 2 : 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ]
      }
    };
    const peerInstance = peerId ? new PeerClass(peerId, config) : new PeerClass(config);
    this.peer = peerInstance;
    peerInstance.on("open", (id) => {
      this.myPeerId = id;
      this.startPingLoop();
      this.emit("ready", id);
    });
    peerInstance.on("connection", (conn) => {
      this.handleIncomingConnection(conn);
    });
    peerInstance.on("error", (err) => {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    });
    peerInstance.on("close", () => {
      this.destroy();
    });
  }
  /**
   * Connect to a remote peer with both reliable and unreliable channels
   */
  connectToPeer(remotePeerId) {
    if (!this.peer || this.peer.destroyed || remotePeerId === this.myPeerId) {
      return;
    }
    let pair = this.connections.get(remotePeerId);
    if (!pair) {
      pair = {
        peerId: remotePeerId,
        stats: {
          peerId: remotePeerId,
          ping: 0,
          lastPingTimestamp: 0,
          bytesSent: 0,
          bytesReceived: 0,
          connectedAt: Date.now()
        }
      };
      this.connections.set(remotePeerId, pair);
    }
    if (!pair.reliable || !pair.reliable.open) {
      const reliableConn = this.peer.connect(remotePeerId, {
        label: "reliable",
        reliable: true
      });
      this.setupConnectionEvents(reliableConn, "reliable");
      pair.reliable = reliableConn;
    }
    if (!pair.unreliable || !pair.unreliable.open) {
      const unreliableConn = this.peer.connect(remotePeerId, {
        label: "unreliable",
        reliable: false
      });
      this.setupConnectionEvents(unreliableConn, "unreliable");
      pair.unreliable = unreliableConn;
    }
  }
  handleIncomingConnection(conn) {
    const remotePeerId = conn.peer;
    let pair = this.connections.get(remotePeerId);
    if (!pair) {
      pair = {
        peerId: remotePeerId,
        stats: {
          peerId: remotePeerId,
          ping: 0,
          lastPingTimestamp: 0,
          bytesSent: 0,
          bytesReceived: 0,
          connectedAt: Date.now()
        }
      };
      this.connections.set(remotePeerId, pair);
    }
    const channelType = conn.label === "unreliable" ? "unreliable" : "reliable";
    if (channelType === "reliable") {
      pair.reliable = conn;
    } else {
      pair.unreliable = conn;
    }
    this.setupConnectionEvents(conn, channelType);
  }
  setupConnectionEvents(conn, channel) {
    const remotePeerId = conn.peer;
    conn.on("open", () => {
      this.emit("peerConnected", remotePeerId);
    });
    conn.on("data", (raw) => {
      this.handleIncomingData(remotePeerId, raw, channel);
    });
    conn.on("close", () => {
      this.cleanupConnection(remotePeerId, channel);
    });
    conn.on("error", (err) => {
      console.warn(`Connection error with peer ${remotePeerId}:`, err);
    });
  }
  handleIncomingData(senderPeerId, raw, channel) {
    const pair = this.connections.get(senderPeerId);
    if (raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
      const parsed = PacketSerializer.parseBinaryPacket(raw);
      if (parsed) {
        if (pair) {
          pair.stats.bytesReceived += raw.byteLength || 0;
        }
        this.emit("binary", {
          senderPeerId,
          type: parsed.type,
          timestamp: parsed.timestamp,
          seq: parsed.seq,
          payload: parsed.payload
        });
        return;
      }
    }
    if (typeof raw === "object" && raw !== null && "type" in raw) {
      const packet = raw;
      if (pair) {
        pair.stats.bytesReceived += JSON.stringify(raw).length;
      }
      if (packet.type === 1 /* PING */) {
        this.sendJson(senderPeerId, PacketSerializer.createJsonPacket(
          2 /* PONG */,
          this.myPeerId || "",
          packet.data
        ), "reliable");
        return;
      }
      if (packet.type === 2 /* PONG */) {
        const sentTime = packet.data?.sentAt;
        if (typeof sentTime === "number") {
          const rtt = Date.now() - sentTime;
          if (pair) {
            pair.stats.ping = rtt;
            pair.stats.lastPingTimestamp = Date.now();
          }
          this.emit("pingUpdate", { peerId: senderPeerId, ping: rtt });
        }
        return;
      }
      this.emit("data", {
        senderPeerId,
        packet,
        channel
      });
    }
  }
  cleanupConnection(remotePeerId, channel) {
    const pair = this.connections.get(remotePeerId);
    if (!pair) return;
    if (channel === "reliable") {
      delete pair.reliable;
    } else {
      delete pair.unreliable;
    }
    if (!pair.reliable && !pair.unreliable) {
      this.connections.delete(remotePeerId);
      this.emit("peerDisconnected", remotePeerId);
    }
  }
  /**
   * Send arbitrary JSON payload to a specific peer
   */
  sendJson(peerId, packet, channel = "reliable") {
    const pair = this.connections.get(peerId);
    if (!pair) return false;
    const targetConn = channel === "unreliable" && pair.unreliable?.open ? pair.unreliable : pair.reliable;
    if (targetConn && targetConn.open) {
      targetConn.send(packet);
      pair.stats.bytesSent += JSON.stringify(packet).length;
      return true;
    }
    return false;
  }
  /**
   * Send binary data (Uint8Array / ArrayBuffer) to a specific peer (ideal for FPS)
   */
  sendBinary(peerId, type, payload, channel = "unreliable") {
    const pair = this.connections.get(peerId);
    if (!pair) return false;
    const targetConn = channel === "unreliable" && pair.unreliable?.open ? pair.unreliable : pair.reliable;
    if (targetConn && targetConn.open) {
      const packet = PacketSerializer.createBinaryPacket(type, payload);
      targetConn.send(packet);
      pair.stats.bytesSent += packet.byteLength;
      return true;
    }
    return false;
  }
  /**
   * Broadcast JSON payload to all connected peers
   */
  broadcastJson(packet, channel = "reliable") {
    for (const peerId of this.connections.keys()) {
      this.sendJson(peerId, packet, channel);
    }
  }
  /**
   * Broadcast binary data to all connected peers
   */
  broadcastBinary(type, payload, channel = "unreliable") {
    for (const peerId of this.connections.keys()) {
      this.sendBinary(peerId, type, payload, channel);
    }
  }
  /**
   * Send periodic PING to measure RTT latency
   */
  startPingLoop() {
    if (this.pingIntervalId) return;
    this.pingIntervalId = setInterval(() => {
      if (this.isDestroyed) return;
      const now = Date.now();
      for (const [peerId, pair] of this.connections.entries()) {
        if (pair.reliable && pair.reliable.open) {
          this.sendJson(
            peerId,
            PacketSerializer.createJsonPacket(1 /* PING */, this.myPeerId || "", { sentAt: now }),
            "reliable"
          );
        }
      }
    }, this.pingIntervalMs);
  }
  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    for (const pair of this.connections.values()) {
      try {
        pair.reliable?.close();
        pair.unreliable?.close();
      } catch {
      }
    }
    this.connections.clear();
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {
      }
    }
    this.peer = null;
    this.myPeerId = null;
    this.removeAllListeners();
  }
};

// src/engines/RealtimeEngine.ts
var RealtimeEngine = class extends TypedEventEmitter {
  peerManager;
  tickRate;
  interpolationDelayMs;
  isHost;
  localEntities = /* @__PURE__ */ new Map();
  remoteEntityHistory = /* @__PURE__ */ new Map();
  tickIntervalId = null;
  currentTick = 0;
  constructor(options) {
    super();
    this.peerManager = options.peerManager;
    this.tickRate = options.tickRate ?? 30;
    this.interpolationDelayMs = options.interpolationDelayMs ?? 50;
    this.isHost = options.isHost ?? false;
    this.setupListeners();
    this.startTickLoop();
  }
  setupListeners() {
    this.peerManager.on("data", ({ senderPeerId, packet }) => {
      if (packet.type === 40 /* REALTIME_SNAPSHOT */) {
        const { entityId, state } = packet.data;
        this.recordSnapshot(entityId, state, packet.timestamp);
        this.emit("entityUpdate", { entityId, state, senderPeerId });
      }
    });
    this.peerManager.on("binary", ({ senderPeerId, type, payload, timestamp }) => {
      if (type === 40 /* REALTIME_SNAPSHOT */) {
        if (payload.byteLength === 14) {
          const v2 = PacketSerializer.unpackVector2(payload);
          const state = { ...v2, timestamp };
          this.recordSnapshot(v2.entityId, v2, timestamp);
          this.emit("vector2Update", { ...state, senderPeerId });
        } else if (payload.byteLength === 18) {
          const v3 = PacketSerializer.unpackVector3(payload);
          const state = { ...v3, timestamp };
          this.recordSnapshot(v3.entityId, v3, timestamp);
          this.emit("vector3Update", { ...state, senderPeerId });
        }
      }
    });
  }
  recordSnapshot(entityId, state, timestamp) {
    let history = this.remoteEntityHistory.get(entityId);
    if (!history) {
      history = [];
      this.remoteEntityHistory.set(entityId, history);
    }
    history.push({ id: entityId, state, timestamp });
    if (history.length > 20) {
      history.shift();
    }
  }
  /**
   * Register or update a local entity's state (e.g. local player)
   */
  setLocalEntity(entityId, state) {
    this.localEntities.set(entityId, state);
  }
  /**
   * Send 3D coordinates (position X, Y, Z + rotation Y) via ultra-fast binary packet
   * Total payload: only 18 bytes! Ideal for FPS / 3D games.
   */
  sendVector3(entityId, x, y, z, rotY) {
    const payload = PacketSerializer.packVector3(entityId, x, y, z, rotY);
    this.peerManager.broadcastBinary(40 /* REALTIME_SNAPSHOT */, payload, "unreliable");
    this.setLocalEntity(entityId, { x, y, z, rotY });
  }
  /**
   * Send 2D coordinates (position X, Y + angle) via ultra-fast binary packet
   * Total payload: only 14 bytes! Ideal for 2D arena / top-down shooters.
   */
  sendVector2(entityId, x, y, angle) {
    const payload = PacketSerializer.packVector2(entityId, x, y, angle);
    this.peerManager.broadcastBinary(40 /* REALTIME_SNAPSHOT */, payload, "unreliable");
    this.setLocalEntity(entityId, { x, y, angle });
  }
  /**
   * Send arbitrary JSON state for an entity over unreliable UDP WebRTC channel
   */
  broadcastEntityState(entityId, state) {
    this.setLocalEntity(entityId, state);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(
        40 /* REALTIME_SNAPSHOT */,
        this.peerManager.peerId || "",
        { entityId, state }
      ),
      "unreliable"
    );
  }
  /**
   * Get interpolated state for smooth rendering (eliminates jitter and stutter)
   */
  getInterpolatedPosition(entityId, customRenderTime) {
    const history = this.remoteEntityHistory.get(entityId);
    if (!history || history.length === 0) return null;
    if (history.length === 1) return history[0].state;
    const renderTime = customRenderTime ?? Date.now() - this.interpolationDelayMs;
    let s0 = null;
    let s1 = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp <= renderTime) {
        s0 = history[i];
        s1 = history[i + 1] || history[i];
        break;
      }
    }
    if (!s0 || !s1) {
      return s0 ? s0.state : history[0].state;
    }
    if (s0 === s1 || s0.timestamp === s1.timestamp) {
      return s0.state;
    }
    const t = Math.max(0, Math.min(1, (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp)));
    const lerp = (a, b, factor) => a + (b - a) * factor;
    const res = {
      x: lerp(s0.state.x, s1.state.x, t),
      y: lerp(s0.state.y, s1.state.y, t)
    };
    if (typeof s0.state.z === "number" && typeof s1.state.z === "number") {
      res.z = lerp(s0.state.z, s1.state.z, t);
    }
    return res;
  }
  startTickLoop() {
    const intervalMs = Math.floor(1e3 / this.tickRate);
    this.tickIntervalId = setInterval(() => {
      this.currentTick++;
      this.emit("tick", this.currentTick);
      for (const [id, state] of this.localEntities.entries()) {
        if (typeof state.z === "number" && typeof id === "number") {
          this.sendVector3(id, state.x, state.y, state.z, state.rotY ?? 0);
        } else if (typeof state.x === "number" && typeof state.y === "number" && typeof id === "number") {
          this.sendVector2(id, state.x, state.y, state.angle ?? 0);
        } else {
          this.broadcastEntityState(id, state);
        }
      }
    }, intervalMs);
  }
  destroy() {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    this.localEntities.clear();
    this.remoteEntityHistory.clear();
    this.removeAllListeners();
  }
};

// src/engines/LockstepEngine.ts
var LockstepEngine = class extends TypedEventEmitter {
  peerManager;
  tickDurationMs;
  commandDelayTicks;
  currentTick = 0;
  isRunning = false;
  isPausedForLag = false;
  tickTimer = null;
  // Stored commands per tick: tickNumber -> LockstepCommand[]
  scheduledCommands = /* @__PURE__ */ new Map();
  // Track received acks/commands from each peer per tick: tickNumber -> Set<peerId>
  tickPeerReceipts = /* @__PURE__ */ new Map();
  knownPeers = /* @__PURE__ */ new Set();
  constructor(options) {
    super();
    this.peerManager = options.peerManager;
    this.tickDurationMs = options.tickDurationMs ?? 100;
    this.commandDelayTicks = options.commandDelayTicks ?? 2;
    if (options.playerIds) {
      for (const p of options.playerIds) this.knownPeers.add(p);
    }
    this.setupListeners();
  }
  setupListeners() {
    this.peerManager.on("peerConnected", (peerId) => {
      this.knownPeers.add(peerId);
    });
    this.peerManager.on("peerDisconnected", (peerId) => {
      this.knownPeers.delete(peerId);
    });
    this.peerManager.on("data", ({ senderPeerId, packet }) => {
      if (packet.type === 30 /* LOCKSTEP_COMMAND */) {
        const cmd = packet.data;
        this.registerRemoteCommand(cmd, senderPeerId);
      } else if (packet.type === 31 /* LOCKSTEP_TICK_ACK */) {
        const { tick } = packet.data;
        this.registerTickAck(tick, senderPeerId);
      }
    });
  }
  /**
   * Queue a gameplay command for the next executable tick (e.g. move army, build unit)
   */
  queueCommand(action, payload) {
    const targetTick = this.currentTick + this.commandDelayTicks;
    const cmd = {
      playerId: this.peerManager.peerId || "local",
      action,
      payload,
      targetTick
    };
    let list = this.scheduledCommands.get(targetTick);
    if (!list) {
      list = [];
      this.scheduledCommands.set(targetTick, list);
    }
    list.push(cmd);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(30 /* LOCKSTEP_COMMAND */, this.peerManager.peerId || "", cmd),
      "reliable"
    );
    return cmd;
  }
  registerRemoteCommand(cmd, senderPeerId) {
    let list = this.scheduledCommands.get(cmd.targetTick);
    if (!list) {
      list = [];
      this.scheduledCommands.set(cmd.targetTick, list);
    }
    list.push(cmd);
    this.registerTickAck(cmd.targetTick, senderPeerId);
  }
  registerTickAck(tick, senderPeerId) {
    let acks = this.tickPeerReceipts.get(tick);
    if (!acks) {
      acks = /* @__PURE__ */ new Set();
      this.tickPeerReceipts.set(tick, acks);
    }
    acks.add(senderPeerId);
    if (this.isPausedForLag && this.canAdvanceTick(this.currentTick)) {
      this.isPausedForLag = false;
      this.emit("lagResume", { tick: this.currentTick });
      this.advanceTick();
    }
  }
  canAdvanceTick(tick) {
    const acks = this.tickPeerReceipts.get(tick);
    for (const peerId of this.knownPeers) {
      if (peerId !== this.peerManager.peerId) {
        if (!acks || !acks.has(peerId)) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Start the deterministic lockstep simulation loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentTick = 0;
    this.tickTimer = setInterval(() => {
      this.advanceTick();
    }, this.tickDurationMs);
  }
  advanceTick() {
    if (!this.isRunning || this.isPausedForLag) return;
    for (const peerId of this.knownPeers) {
      if (peerId !== this.peerManager.peerId) {
        const acks = this.tickPeerReceipts.get(this.currentTick);
        if (!acks || !acks.has(peerId)) {
          this.isPausedForLag = true;
          this.emit("lagPause", { tick: this.currentTick, waitingForPeerId: peerId });
          return;
        }
      }
    }
    const commands = this.scheduledCommands.get(this.currentTick) || [];
    this.emit("tickExecute", { tick: this.currentTick, commands });
    this.scheduledCommands.delete(this.currentTick);
    this.tickPeerReceipts.delete(this.currentTick);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(31 /* LOCKSTEP_TICK_ACK */, this.peerManager.peerId || "", {
        tick: this.currentTick + this.commandDelayTicks
      }),
      "reliable"
    );
    this.currentTick++;
  }
  /**
   * Pause the simulation
   */
  pause() {
    this.isRunning = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
  destroy() {
    this.pause();
    this.scheduledCommands.clear();
    this.tickPeerReceipts.clear();
    this.knownPeers.clear();
    this.removeAllListeners();
  }
};

// src/engines/TurnBasedEngine.ts
var TurnBasedEngine = class extends TypedEventEmitter {
  peerManager;
  playersOrder;
  currentTurnIndex = 0;
  turnNumber = 1;
  turnTimeoutMs;
  timerId = null;
  history = [];
  constructor(options) {
    super();
    this.peerManager = options.peerManager;
    this.playersOrder = [...options.playersOrder];
    this.turnTimeoutMs = options.turnTimeoutMs;
    this.turnNumber = options.initialTurnNumber ?? 1;
    this.setupListeners();
  }
  get activePlayerId() {
    return this.playersOrder[this.currentTurnIndex] || "";
  }
  get currentTurnNumber() {
    return this.turnNumber;
  }
  get isMyTurn() {
    return this.activePlayerId === this.peerManager.peerId;
  }
  get actionHistory() {
    return [...this.history];
  }
  setupListeners() {
    this.peerManager.on("data", ({ packet }) => {
      if (packet.type === 20 /* TURN_ACTION */) {
        const action = packet.data;
        this.history.push(action);
        this.emit("action", action);
      } else if (packet.type === 21 /* TURN_END */) {
        this.advanceTurnInternal(packet.data?.nextTurnNumber);
      }
    });
  }
  /**
   * Start the turn loop (initiates timer for the first player)
   */
  start() {
    this.resetTimer();
    this.emit("turnChange", {
      activePlayerId: this.activePlayerId,
      turnNumber: this.turnNumber,
      remainingTimeMs: this.turnTimeoutMs
    });
  }
  /**
   * Submit an action during the active turn
   */
  submitAction(action, payload) {
    if (!this.isMyTurn) {
      throw new Error(`Cannot submit action: it is ${this.activePlayerId}'s turn, not yours`);
    }
    const turnAction = {
      playerId: this.peerManager.peerId || "local",
      action,
      payload,
      turnNumber: this.turnNumber,
      timestamp: Date.now()
    };
    this.history.push(turnAction);
    this.emit("action", turnAction);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(20 /* TURN_ACTION */, this.peerManager.peerId || "", turnAction),
      "reliable"
    );
    return turnAction;
  }
  /**
   * End the current player's turn and pass to the next player
   */
  passTurn() {
    if (!this.isMyTurn) {
      throw new Error(`Cannot pass turn: it is not your turn`);
    }
    const nextTurnNumber = this.turnNumber + 1;
    this.advanceTurnInternal(nextTurnNumber);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(21 /* TURN_END */, this.peerManager.peerId || "", { nextTurnNumber }),
      "reliable"
    );
  }
  advanceTurnInternal(explicitTurnNumber) {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playersOrder.length;
    this.turnNumber = explicitTurnNumber ?? this.turnNumber + 1;
    this.resetTimer();
    this.emit("turnChange", {
      activePlayerId: this.activePlayerId,
      turnNumber: this.turnNumber,
      remainingTimeMs: this.turnTimeoutMs
    });
  }
  resetTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.turnTimeoutMs && this.turnTimeoutMs > 0) {
      this.timerId = setTimeout(() => {
        const timedOutId = this.activePlayerId;
        this.emit("turnTimeout", {
          timedOutPlayerId: timedOutId,
          turnNumber: this.turnNumber
        });
        this.advanceTurnInternal();
      }, this.turnTimeoutMs);
    }
  }
  destroy() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.history = [];
    this.removeAllListeners();
  }
};

// src/engines/SharedStateEngine.ts
var SharedStateEngine = class extends TypedEventEmitter {
  peerManager;
  isHost;
  state;
  keyVersions = /* @__PURE__ */ new Map();
  keySubscribers = /* @__PURE__ */ new Map();
  constructor(options) {
    super();
    this.peerManager = options.peerManager;
    this.isHost = options.isHost ?? false;
    this.state = { ...options.initialState || {} };
    for (const key of Object.keys(this.state)) {
      this.keyVersions.set(key, 1);
    }
    this.setupListeners();
  }
  setupListeners() {
    this.peerManager.on("peerConnected", (peerId) => {
      if (this.isHost) {
        this.peerManager.sendJson(
          peerId,
          PacketSerializer.createJsonPacket(51 /* SHARED_STATE_SYNC */, this.peerManager.peerId || "", {
            state: this.state,
            versions: Object.fromEntries(this.keyVersions.entries())
          }),
          "reliable"
        );
      }
    });
    this.peerManager.on("data", ({ packet }) => {
      if (packet.type === 50 /* SHARED_STATE_SET */) {
        const op = packet.data;
        this.applyOperation(op, false);
      } else if (packet.type === 51 /* SHARED_STATE_SYNC */) {
        const { state, versions } = packet.data;
        this.applyFullSync(state, versions);
      }
    });
  }
  /**
   * Set a key-value pair and broadcast to all peers
   */
  set(key, value) {
    const currentVersion = this.keyVersions.get(key) || 0;
    const nextVersion = currentVersion + 1;
    const op = {
      key,
      type: "set",
      value,
      version: nextVersion,
      authorPeerId: this.peerManager.peerId || "local"
    };
    this.applyOperation(op, true);
  }
  /**
   * Push an item into an array state value (e.g. canvas strokes, logs)
   */
  push(key, item) {
    const currentList = Array.isArray(this.state[key]) ? this.state[key] : [];
    const nextList = [...currentList, item];
    this.set(key, nextList);
  }
  /**
   * Get value by key
   */
  get(key, defaultValue) {
    return this.state[key] !== void 0 ? this.state[key] : defaultValue;
  }
  /**
   * Get entire state snapshot
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Subscribe to changes on a specific key
   */
  subscribe(key, callback) {
    let subs = this.keySubscribers.get(key);
    if (!subs) {
      subs = /* @__PURE__ */ new Set();
      this.keySubscribers.set(key, subs);
    }
    subs.add(callback);
    return () => {
      subs?.delete(callback);
      if (subs?.size === 0) {
        this.keySubscribers.delete(key);
      }
    };
  }
  applyOperation(op, broadcast) {
    const localVer = this.keyVersions.get(op.key) || 0;
    if (op.version >= localVer) {
      this.state[op.key] = op.value;
      this.keyVersions.set(op.key, op.version);
      const subs = this.keySubscribers.get(op.key);
      if (subs) {
        for (const cb of subs) {
          try {
            cb(op.value, op.authorPeerId);
          } catch (e) {
            console.error("Error in state subscriber:", e);
          }
        }
      }
      this.emit("change", { key: op.key, value: op.value, authorPeerId: op.authorPeerId });
      if (broadcast) {
        this.peerManager.broadcastJson(
          PacketSerializer.createJsonPacket(50 /* SHARED_STATE_SET */, this.peerManager.peerId || "", op),
          "reliable"
        );
      }
    }
  }
  applyFullSync(newState, versions) {
    this.state = { ...newState };
    this.keyVersions.clear();
    for (const [k, v] of Object.entries(versions)) {
      this.keyVersions.set(k, v);
    }
    for (const [key, subs] of this.keySubscribers.entries()) {
      const val = this.state[key];
      for (const cb of subs) {
        try {
          cb(val, "sync");
        } catch (e) {
          console.error(e);
        }
      }
    }
    this.emit("sync", this.state);
  }
  destroy() {
    this.keySubscribers.clear();
    this.keyVersions.clear();
    this.removeAllListeners();
  }
};

// src/core/GameNetClient.ts
var GameNetClient = class extends TypedEventEmitter {
  matrix;
  gameId;
  peerConfig;
  currentLobby = null;
  peerManager = null;
  constructor(options = {}) {
    super();
    this.gameId = options.gameId || "matrix-peer-game";
    this.matrix = new MatrixClient(options.homeserver || "https://matrix.org");
    this.peerConfig = options.peerConfig;
    this.setupMatrixEvents();
  }
  get lobby() {
    return this.currentLobby;
  }
  get peer() {
    return this.peerManager;
  }
  get isHost() {
    return this.currentLobby?.isHost ?? false;
  }
  get myPeerId() {
    return this.peerManager?.peerId ?? null;
  }
  get currentUserId() {
    return this.matrix.currentUserId;
  }
  setupMatrixEvents() {
    this.matrix.on("error", (err) => {
      this.emit("error", err);
    });
  }
  /**
   * Register as a guest without requiring an account or email
   */
  async loginAsGuest(nickname) {
    const auth = await this.matrix.registerGuest(nickname);
    this.matrix.startSync();
    this.emit("authenticated", auth);
    return auth;
  }
  /**
   * Log in using existing Matrix account
   */
  async loginWithPassword(username, password) {
    const auth = await this.matrix.loginWithPassword(username, password);
    this.matrix.startSync();
    this.emit("authenticated", auth);
    return auth;
  }
  /**
   * Restore existing session with token
   */
  restoreSession(auth) {
    this.matrix.setAuth(auth);
    this.matrix.startSync();
    this.emit("authenticated", auth);
  }
  /**
   * List available public game lobbies for this game
   */
  async listLobbies(limit = 20) {
    return LobbyDiscovery.searchLobbies(this.matrix, {
      gameId: this.gameId,
      limit
    });
  }
  /**
   * Create a new multiplayer game lobby
   */
  async createLobby(options) {
    const createOpts = {
      name: options.name,
      topic: options.topic,
      gameId: this.gameId,
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata
    };
    const roomId = await this.matrix.createLobbyRoom(createOpts);
    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: this.gameId,
      hostUserId: this.matrix.currentUserId || "",
      maxPlayers: createOpts.maxPlayers,
      metadata: createOpts.metadata,
      status: "waiting"
    });
    this.currentLobby = lobby;
    this.initPeerNetwork(true);
    this.emit("lobbyJoined", lobby);
    return lobby;
  }
  /**
   * Join an existing lobby room by its Matrix room ID or alias
   */
  async joinLobby(roomIdOrAlias) {
    const roomId = await this.matrix.joinRoom(roomIdOrAlias);
    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: this.gameId,
      status: "waiting"
    });
    this.currentLobby = lobby;
    this.initPeerNetwork(false);
    lobby.on("hostPeerIdAvailable", (hostPeerId) => {
      if (this.peerManager && !lobby.isHost) {
        this.peerManager.connectToPeer(hostPeerId);
      }
    });
    lobby.on("gameStarted", ({ hostPeerId }) => {
      if (hostPeerId && this.peerManager && !lobby.isHost) {
        this.peerManager.connectToPeer(hostPeerId);
      }
    });
    this.emit("lobbyJoined", lobby);
    return lobby;
  }
  initPeerNetwork(isHost) {
    if (this.peerManager) {
      this.peerManager.destroy();
    }
    const peerOpts = {
      isHost,
      peerConfig: this.peerConfig
    };
    this.peerManager = new PeerManager(peerOpts);
    this.peerManager.on("ready", async (peerId) => {
      if (this.currentLobby) {
        await this.currentLobby.setPeerId(peerId);
        if (!isHost && this.currentLobby.hostPeerId) {
          this.peerManager?.connectToPeer(this.currentLobby.hostPeerId);
        }
      }
    });
    this.peerManager.on("peerConnected", (peerId) => {
      this.emit("peerConnected", peerId);
    });
    this.peerManager.on("peerDisconnected", (peerId) => {
      this.emit("peerDisconnected", peerId);
    });
    this.peerManager.on("data", ({ senderPeerId, packet, channel }) => {
      if (packet.type === 10 /* GAME_JSON */) {
        this.emit("gameData", {
          senderPeerId,
          data: packet.data,
          channel
        });
      }
    });
    this.peerManager.on("binary", ({ senderPeerId, type, timestamp, seq, payload }) => {
      this.emit("gameBinary", {
        senderPeerId,
        type,
        timestamp,
        seq,
        payload
      });
    });
    this.peerManager.on("pingUpdate", ({ peerId, ping }) => {
      this.emit("pingUpdate", { peerId, ping });
    });
    this.peerManager.on("error", (err) => {
      this.emit("error", err);
    });
  }
  /**
   * Broadcast arbitrary game data to all connected players via WebRTC
   */
  broadcast(data, channel = "reliable") {
    if (!this.peerManager) return;
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(10 /* GAME_JSON */, this.peerManager.peerId || "", data),
      channel
    );
  }
  /**
   * Send game data to a specific peer via WebRTC
   */
  sendTo(peerId, data, channel = "reliable") {
    if (!this.peerManager) return false;
    return this.peerManager.sendJson(
      peerId,
      PacketSerializer.createJsonPacket(10 /* GAME_JSON */, this.peerManager.peerId || "", data),
      channel
    );
  }
  // --- Specialized Game Engine Constructors ---
  /**
   * Create RealtimeEngine (ideal for FPS, fast 2D/3D action, racers)
   */
  createRealtimeEngine(options = {}) {
    if (!this.peerManager) throw new Error("PeerManager is not initialized; join or create a lobby first");
    return new RealtimeEngine({
      peerManager: this.peerManager,
      isHost: this.isHost,
      ...options
    });
  }
  /**
   * Create LockstepEngine (ideal for RTS, fighting games, deterministic simulations)
   */
  createLockstepEngine(options = {}) {
    if (!this.peerManager) throw new Error("PeerManager is not initialized; join or create a lobby first");
    return new LockstepEngine({
      peerManager: this.peerManager,
      ...options
    });
  }
  /**
   * Create TurnBasedEngine (ideal for board, card, chess, turn-based games)
   */
  createTurnBasedEngine(options) {
    if (!this.peerManager) throw new Error("PeerManager is not initialized; join or create a lobby first");
    return new TurnBasedEngine({
      peerManager: this.peerManager,
      ...options
    });
  }
  /**
   * Create SharedStateEngine (ideal for whiteboard, kalambury, clickers, party games)
   */
  createSharedState(options = {}) {
    if (!this.peerManager) throw new Error("PeerManager is not initialized; join or create a lobby first");
    return new SharedStateEngine({
      peerManager: this.peerManager,
      isHost: this.isHost,
      ...options
    });
  }
  /**
   * Leave the current game lobby and clean up network connections
   */
  async leave() {
    if (this.currentLobby) {
      await this.currentLobby.leave();
      this.currentLobby = null;
    }
    if (this.peerManager) {
      this.peerManager.destroy();
      this.peerManager = null;
    }
  }
  /**
   * Disconnect completely
   */
  destroy() {
    this.leave();
    this.matrix.stopSync();
    this.removeAllListeners();
  }
};

// src/index.ts
var MatrixPeerGame = {
  Client: GameNetClient,
  GameNetClient,
  MatrixClient,
  LobbyRoom,
  LobbyDiscovery,
  PeerManager,
  PacketSerializer,
  PacketType,
  RealtimeEngine,
  LockstepEngine,
  TurnBasedEngine,
  SharedStateEngine
};
if (typeof window !== "undefined") {
  window.MatrixPeerGame = MatrixPeerGame;
}
var index_default = MatrixPeerGame;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Client,
  GameNetClient,
  LobbyDiscovery,
  LobbyRoom,
  LockstepEngine,
  MatrixClient,
  PacketSerializer,
  PacketType,
  PeerManager,
  RealtimeEngine,
  SharedStateEngine,
  TurnBasedEngine,
  TypedEventEmitter
});
//# sourceMappingURL=index.js.map