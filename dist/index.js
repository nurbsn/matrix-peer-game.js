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
var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Client: () => GameNetClient,
  DEFAULT_MQTT_BROKER: () => DEFAULT_MQTT_BROKER,
  DEFAULT_NOSTR_RELAYS: () => DEFAULT_NOSTR_RELAYS,
  FirebaseLobbyProvider: () => FirebaseLobbyProvider,
  GameNetClient: () => GameNetClient,
  LobbyDiscovery: () => LobbyDiscovery,
  LobbyRoom: () => LobbyRoom,
  LockstepEngine: () => LockstepEngine,
  MatrixClient: () => MatrixClient,
  MatrixLobbyProvider: () => MatrixLobbyProvider,
  MatrixPeerGame: () => MatrixPeerGame,
  MqttLobbyProvider: () => MqttLobbyProvider,
  NostrLobbyProvider: () => NostrLobbyProvider,
  PacketSerializer: () => PacketSerializer,
  PacketType: () => PacketType,
  PeerManager: () => PeerManager,
  RealtimeEngine: () => RealtimeEngine,
  SharedStateEngine: () => SharedStateEngine,
  TurnBasedEngine: () => TurnBasedEngine,
  TypedEventEmitter: () => TypedEventEmitter,
  default: () => index_default,
  nOmniPeer: () => nOmniPeer
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
    let data;
    try {
      data = await this.request("/_matrix/client/v3/register?kind=guest", "POST", {});
    } catch (err) {
      if (err.status === 403 || String(err.message).includes("Registration has been disabled")) {
        throw new Error(
          `Serwer ${this.homeserver} ma wy\u0142\u0105czon\u0105 rejestracj\u0119 anonimowych go\u015Bci ze wzgl\u0119d\xF3w antyspamowych. Zaloguj si\u0119 kontem Matrix (Login + Has\u0142o) lub Tokenem dost\u0119pu.`
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
        console.warn("Could not set guest display name:", err);
      }
    }
    return this.auth;
  }
  /**
   * Register a new full user account with username and password
   */
  async registerUser(username, password, displayNickname) {
    const registerBody = {
      username,
      password,
      auth: {
        type: "m.login.dummy"
      }
    };
    let data;
    try {
      data = await this.request("/_matrix/client/v3/register", "POST", registerBody);
    } catch (err) {
      const session = err.data?.session;
      if (err.status === 401 && session) {
        registerBody.auth.session = session;
        data = await this.request("/_matrix/client/v3/register", "POST", registerBody);
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
      } catch {
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
   * Login using an existing access token (retrieves userId automatically via whoami)
   */
  async loginWithToken(accessToken, customUserId) {
    this.auth = {
      userId: customUserId || "",
      accessToken,
      homeserver: this.homeserver
    };
    if (!customUserId) {
      try {
        const whoami = await this.request("/_matrix/client/v3/account/whoami", "GET");
        this.auth.userId = whoami.user_id;
        this.auth.deviceId = whoami.device_id;
      } catch (err) {
        this.auth = null;
        throw new Error("Nieprawid\u0142owy token Matrix: " + err.message);
      }
    }
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

// src/providers/matrix/MatrixLobbyProvider.ts
var MatrixLobbyProvider = class extends TypedEventEmitter {
  providerType = "matrix";
  matrix;
  constructor(homeserver = "https://matrix.org") {
    super();
    this.matrix = new MatrixClient(homeserver);
    this.matrix.on("error", (err) => this.emit("error", err));
  }
  get currentUserId() {
    return this.matrix.currentUserId;
  }
  get isConnected() {
    return this.matrix.isAuthenticated;
  }
  async connect(authOptions) {
    if (authOptions?.token) {
      await this.matrix.loginWithToken(authOptions.token, authOptions.userId);
    } else if (authOptions?.username && authOptions?.password) {
      await this.matrix.loginWithPassword(authOptions.username, authOptions.password);
    } else if (authOptions?.guestNickname) {
      await this.matrix.registerGuest(authOptions.guestNickname);
    }
    this.matrix.startSync();
    this.emit("connected", void 0);
  }
  async disconnect() {
    this.matrix.stopSync();
    this.emit("disconnected", void 0);
  }
  async listLobbies(gameId) {
    const list = await LobbyDiscovery.searchLobbies(this.matrix, { gameId, limit: 30 });
    return list.map((l) => ({
      roomId: l.roomId,
      name: l.name,
      gameId: l.gameId,
      hostNickname: l.hostNickname || "Host",
      numPlayers: l.numJoinedMembers ?? l.numMembers ?? 1,
      maxPlayers: l.maxPlayers,
      status: l.status,
      metadata: l.metadata
    }));
  }
  async createLobby(options) {
    const roomId = await this.matrix.createLobbyRoom({
      name: options.name,
      topic: options.topic,
      gameId: options.gameId || "game",
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata
    });
    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: options.gameId || "game",
      hostUserId: this.matrix.currentUserId || "",
      maxPlayers: options.maxPlayers ?? 4,
      metadata: options.metadata,
      status: "waiting"
    });
    return lobby;
  }
  async joinLobby(roomId, nickname) {
    const joinedRoomId = await this.matrix.joinRoom(roomId);
    if (nickname) {
      try {
        await this.matrix.setDisplayName(nickname);
      } catch {
      }
    }
    const lobby = new LobbyRoom(this.matrix, joinedRoomId, {
      status: "waiting"
    });
    return lobby;
  }
};

// src/providers/nostr/crypto.ts
var P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
var N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bb5bf5670f93448e2dn;
var Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
var Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
var G = { x: Gx, y: Gy };
function mod(a, m) {
  const result = a % m;
  return result >= 0n ? result : result + m;
}
function modPow(base, exp, m) {
  let res = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) res = res * b % m;
    b = b * b % m;
    e >>= 1n;
  }
  return res;
}
function modInverse(a, m) {
  return modPow(a, m - 2n, m);
}
function pointAdd(P1, P2) {
  if (!P1) return P2;
  if (!P2) return P1;
  if (P1.x === P2.x) {
    if (P1.y !== P2.y) return null;
    const num2 = mod(3n * P1.x * P1.x, P);
    const den2 = mod(2n * P1.y, P);
    const s2 = mod(num2 * modInverse(den2, P), P);
    const rx2 = mod(s2 * s2 - 2n * P1.x, P);
    const ry2 = mod(s2 * (P1.x - rx2) - P1.y, P);
    return { x: rx2, y: ry2 };
  }
  const num = mod(P2.y - P1.y, P);
  const den = mod(P2.x - P1.x, P);
  const s = mod(num * modInverse(den, P), P);
  const rx = mod(s * s - P1.x - P2.x, P);
  const ry = mod(s * (P1.x - rx) - P1.y, P);
  return { x: rx, y: ry };
}
function pointMultiply(k, pt = G) {
  let curr = pt;
  let result = null;
  let scalar = k;
  while (scalar > 0n) {
    if (scalar & 1n) {
      result = pointAdd(result, curr);
    }
    curr = pointAdd(curr, curr);
    scalar >>= 1n;
  }
  return result;
}
function toHex32(n) {
  const positive = mod(n, 2n ** 256n);
  return positive.toString(16).padStart(64, "0").slice(-64);
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
async function sha256Bytes(data) {
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
  }
  return syncSha256(data);
}
async function sha256Hex(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await sha256Bytes(bytes);
  return bytesToHex(hash);
}
async function taggedHash(tag, ...msgs) {
  const tagBytes = new TextEncoder().encode(tag);
  const tagHash = await sha256Bytes(tagBytes);
  let totalLen = tagHash.length * 2;
  for (const m of msgs) totalLen += m.length;
  const concat = new Uint8Array(totalLen);
  concat.set(tagHash, 0);
  concat.set(tagHash, tagHash.length);
  let offset = tagHash.length * 2;
  for (const m of msgs) {
    concat.set(m, offset);
    offset += m.length;
  }
  return sha256Bytes(concat);
}
function generateKeyPair() {
  const randBytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randBytes);
  } else {
    for (let i = 0; i < 32; i++) randBytes[i] = Math.floor(Math.random() * 256);
  }
  let d = BigInt("0x" + bytesToHex(randBytes)) % N;
  if (d === 0n) d = 1n;
  const P2 = pointMultiply(d, G);
  if (P2.y % 2n !== 0n) {
    d = N - d;
  }
  return {
    secretKey: toHex32(d),
    publicKey: toHex32(P2.x)
  };
}
async function schnorrSign(msgHashHex, secretKeyHex) {
  let d = BigInt("0x" + secretKeyHex);
  const P0 = pointMultiply(d, G);
  if (P0.y % 2n !== 0n) {
    d = N - d;
  }
  const pxBytes = hexToBytes(toHex32(P0.x));
  const msgBytes = hexToBytes(msgHashHex);
  const randAux = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randAux);
  }
  const t = await taggedHash("BIP0340/nonce", hexToBytes(toHex32(d)), pxBytes, msgBytes, randAux);
  let k = BigInt("0x" + bytesToHex(t)) % N;
  if (k === 0n) k = 1n;
  const R = pointMultiply(k, G);
  if (R.y % 2n !== 0n) {
    k = N - k;
  }
  const rxBytes = hexToBytes(toHex32(R.x));
  const eHash = await taggedHash("BIP0340/challenge", rxBytes, pxBytes, msgBytes);
  const e = BigInt("0x" + bytesToHex(eHash)) % N;
  const s = mod(k + e * d, N);
  return toHex32(R.x) + toHex32(s);
}
function syncSha256(data) {
  const K = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762;
  let h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
  const len = data.length;
  const bitLen = len * 8;
  const padLen = (len + 8 >> 6) + 1 << 6;
  const msg = new Uint8Array(padLen);
  msg.set(data);
  msg[len] = 128;
  const view = new DataView(msg.buffer);
  view.setUint32(padLen - 4, bitLen, false);
  const W = new Uint32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (W[t - 15] >>> 7 | W[t - 15] << 25) ^ (W[t - 15] >>> 18 | W[t - 15] << 14) ^ W[t - 15] >>> 3;
      const s1 = (W[t - 2] >>> 17 | W[t - 2] << 15) ^ (W[t - 2] >>> 19 | W[t - 2] << 13) ^ W[t - 2] >>> 10;
      W[t] = W[t - 16] + s0 + W[t - 7] + s1 | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
      const ch = e & f ^ ~e & g;
      const temp1 = h + S1 + ch + K[t] + W[t] | 0;
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj | 0;
      h = g;
      g = f;
      f = e;
      e = d + temp1 | 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 | 0;
    }
    h0 = h0 + a | 0;
    h1 = h1 + b | 0;
    h2 = h2 + c | 0;
    h3 = h3 + d | 0;
    h4 = h4 + e | 0;
    h5 = h5 + f | 0;
    h6 = h6 + g | 0;
    h7 = h7 + h | 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

// src/providers/nostr/NostrProvider.ts
var DEFAULT_NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social"
];
var NostrRelayPool = class {
  constructor(relayUrls = DEFAULT_NOSTR_RELAYS) {
    this.relayUrls = relayUrls;
  }
  relayUrls;
  sockets = /* @__PURE__ */ new Map();
  messageListeners = /* @__PURE__ */ new Set();
  eoseListeners = /* @__PURE__ */ new Map();
  async connect() {
    if (typeof WebSocket === "undefined") return;
    for (const url of this.relayUrls) {
      if (this.sockets.has(url)) continue;
      try {
        const ws = new WebSocket(url);
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (Array.isArray(data)) {
              const [type, subId, payload] = data;
              if (type === "EVENT" && payload) {
                this.messageListeners.forEach((listener) => listener(payload, url));
              } else if (type === "EOSE" && subId) {
                const cb = this.eoseListeners.get(subId);
                if (cb) cb();
              }
            }
          } catch {
          }
        };
        ws.onerror = () => {
        };
        this.sockets.set(url, ws);
      } catch {
      }
    }
  }
  onMessage(listener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }
  send(message) {
    const raw = JSON.stringify(message);
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(raw);
        } catch {
        }
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => {
          try {
            ws.send(raw);
          } catch {
          }
        }, { once: true });
      }
    }
  }
  subscribe(subId, filter, onEose) {
    if (onEose) this.eoseListeners.set(subId, onEose);
    this.send(["REQ", subId, filter]);
  }
  unsubscribe(subId) {
    this.eoseListeners.delete(subId);
    this.send(["CLOSE", subId]);
  }
  close() {
    for (const ws of this.sockets.values()) {
      try {
        ws.close();
      } catch {
      }
    }
    this.sockets.clear();
    this.messageListeners.clear();
    this.eoseListeners.clear();
  }
};
var NostrLobbySession = class extends TypedEventEmitter {
  constructor(pool, keyPair, options) {
    super();
    this.pool = pool;
    this.keyPair = keyPair;
    this.roomId = options.roomId;
    this.isHost = options.isHost;
    this.gameId = options.gameId;
    this.hostUserId = options.hostUserId;
    this._hostPeerId = options.hostPeerId;
    this.maxPlayers = options.maxPlayers ?? 4;
    this.metadata = options.metadata || {};
    this.subId = "sub_" + Math.random().toString(36).substring(2, 9);
    this._players.set(keyPair.publicKey, {
      userId: keyPair.publicKey,
      nickname: options.nickname,
      isHost: options.isHost,
      isReady: options.isHost,
      peerId: options.hostPeerId
    });
    this.initNetwork();
  }
  pool;
  keyPair;
  roomId;
  isHost;
  gameId;
  hostUserId;
  maxPlayers;
  metadata;
  _status = "waiting";
  _hostPeerId;
  _players = /* @__PURE__ */ new Map();
  _chatMessages = [];
  heartbeatTimer = null;
  subId;
  unsubscribeMessages = null;
  get players() {
    return Array.from(this._players.values());
  }
  get chatMessages() {
    return [...this._chatMessages];
  }
  get status() {
    return this._status;
  }
  get hostPeerId() {
    return this._hostPeerId;
  }
  async publishEvent(kind, tags, contentObj) {
    const content = typeof contentObj === "string" ? contentObj : JSON.stringify(contentObj);
    const createdAt = Math.floor(Date.now() / 1e3);
    const serialized = JSON.stringify([0, this.keyPair.publicKey, createdAt, kind, tags, content]);
    const id = await sha256Hex(serialized);
    const sig = await schnorrSign(id, this.keyPair.secretKey);
    const event = {
      id,
      pubkey: this.keyPair.publicKey,
      created_at: createdAt,
      kind,
      tags,
      content,
      sig
    };
    this.pool.send(["EVENT", event]);
  }
  initNetwork() {
    this.unsubscribeMessages = this.pool.onMessage((event) => {
      this.handleIncomingEvent(event);
    });
    this.pool.subscribe(this.subId, {
      kinds: [20001, 20002, 20003],
      "#d": [this.roomId],
      since: Math.floor(Date.now() / 1e3) - 30
    });
    if (this.isHost) {
      this.broadcastLobbyHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.broadcastLobbyHeartbeat();
      }, 8e3);
    } else {
      const self = this._players.get(this.keyPair.publicKey);
      if (self) {
        this.publishEvent(20002, [["d", this.roomId]], {
          type: "player_update",
          player: self
        });
      }
    }
  }
  broadcastLobbyHeartbeat() {
    this.publishEvent(20001, [["d", this.roomId], ["t", "mpg-lobby"], ["g", this.gameId]], {
      name: this.metadata.name || "Nostr Lobby",
      gameId: this.gameId,
      hostUserId: this.hostUserId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || "Host",
      hostPeerId: this._hostPeerId,
      maxPlayers: this.maxPlayers,
      numPlayers: this._players.size,
      status: this._status,
      metadata: this.metadata
    });
  }
  handleIncomingEvent(event) {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (dTag !== this.roomId) return;
    try {
      const data = JSON.parse(event.content);
      if (event.kind === 20001) {
        if (data.status && data.status !== this._status) {
          this._status = data.status;
        }
        if (data.hostPeerId && data.hostPeerId !== this._hostPeerId) {
          this._hostPeerId = data.hostPeerId;
          this.emit("hostPeerIdAvailable", data.hostPeerId);
        }
        this.emit("lobbyUpdated", data);
      } else if (event.kind === 20002) {
        if (data.type === "player_update" && data.player) {
          const p = data.player;
          const isNew = !this._players.has(p.userId);
          this._players.set(p.userId, p);
          if (p.isHost && p.peerId && p.peerId !== this._hostPeerId) {
            this._hostPeerId = p.peerId;
            this.emit("hostPeerIdAvailable", p.peerId);
          }
          if (isNew) {
            this.emit("playerJoined", p);
          } else {
            this.emit("playerUpdated", p);
          }
        } else if (data.type === "start_game") {
          this._status = "in_game";
          if (data.hostPeerId) this._hostPeerId = data.hostPeerId;
          this.emit("gameStarted", {
            hostPeerId: data.hostPeerId || this._hostPeerId,
            metadata: data.metadata || {}
          });
        }
      } else if (event.kind === 20003) {
        const chatMsg = {
          id: event.id,
          senderUserId: event.pubkey,
          senderNickname: data.nickname || event.pubkey.substring(0, 8),
          text: data.text,
          timestamp: event.created_at * 1e3
        };
        this._chatMessages.push(chatMsg);
        this.emit("chatMessage", chatMsg);
      }
    } catch {
    }
  }
  async setReady(ready, data) {
    const self = this._players.get(this.keyPair.publicKey);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };
    await this.publishEvent(20002, [["d", this.roomId]], {
      type: "player_update",
      player: self
    });
    this.emit("playerUpdated", self);
  }
  async setPeerId(peerId) {
    const self = this._players.get(this.keyPair.publicKey);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit("hostPeerIdAvailable", peerId);
    }
    await this.publishEvent(20002, [["d", this.roomId]], {
      type: "player_update",
      player: self
    });
  }
  async sendChatMessage(text) {
    const self = this._players.get(this.keyPair.publicKey);
    const nickname = self?.nickname || "Gracz";
    await this.publishEvent(20003, [["d", this.roomId]], {
      text,
      nickname
    });
  }
  async startGame(metadata) {
    if (!this.isHost) return;
    this._status = "in_game";
    await this.publishEvent(20002, [["d", this.roomId]], {
      type: "start_game",
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
    this.emit("gameStarted", {
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
  }
  async leave() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribeMessages) this.unsubscribeMessages();
    this.pool.unsubscribe(this.subId);
  }
};
var NostrLobbyProvider = class extends TypedEventEmitter {
  providerType = "nostr";
  pool;
  keyPair;
  _isConnected = false;
  constructor(relays = DEFAULT_NOSTR_RELAYS) {
    super();
    this.pool = new NostrRelayPool(relays);
    this.keyPair = this.loadOrGenerateKeys();
  }
  get currentUserId() {
    return this.keyPair.publicKey;
  }
  get isConnected() {
    return this._isConnected;
  }
  loadOrGenerateKeys() {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("mpg_nostr_keypair");
        if (stored) return JSON.parse(stored);
      }
    } catch {
    }
    const keys = generateKeyPair();
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mpg_nostr_keypair", JSON.stringify(keys));
      }
    } catch {
    }
    return keys;
  }
  async connect(authOptions) {
    if (authOptions?.secretKey) {
      this.keyPair = {
        secretKey: authOptions.secretKey,
        publicKey: authOptions.publicKey
      };
    }
    await this.pool.connect();
    this._isConnected = true;
    this.emit("connected", void 0);
  }
  async disconnect() {
    this.pool.close();
    this._isConnected = false;
    this.emit("disconnected", void 0);
  }
  async listLobbies(gameId) {
    return new Promise((resolve) => {
      const subId = "list_" + Math.random().toString(36).substring(2, 9);
      const lobbiesMap = /* @__PURE__ */ new Map();
      const unsubscribe = this.pool.onMessage((event) => {
        if (event.kind !== 20001) return;
        const dTag = event.tags.find((t) => t[0] === "d")?.[1];
        if (!dTag) return;
        try {
          const data = JSON.parse(event.content);
          if (data.gameId !== gameId) return;
          const prev = lobbiesMap.get(dTag);
          if (!prev || event.created_at > prev.createdAt) {
            lobbiesMap.set(dTag, {
              createdAt: event.created_at,
              info: {
                roomId: dTag,
                name: data.name || "Pok\xF3j Gry",
                gameId: data.gameId || gameId,
                hostNickname: data.hostNickname || "Host",
                numPlayers: data.numPlayers || 1,
                maxPlayers: data.maxPlayers || 4,
                status: data.status || "waiting",
                metadata: data.metadata
              }
            });
          }
        } catch {
        }
      });
      this.pool.subscribe(
        subId,
        {
          kinds: [20001],
          "#t": ["mpg-lobby"],
          "#g": [gameId],
          since: Math.floor(Date.now() / 1e3) - 45
        },
        () => {
          finish();
        }
      );
      const timeout = setTimeout(() => {
        finish();
      }, 1500);
      const finish = () => {
        clearTimeout(timeout);
        unsubscribe();
        this.pool.unsubscribe(subId);
        resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
      };
    });
  }
  async createLobby(options) {
    const roomId = "nostr_" + Math.random().toString(36).substring(2, 12);
    const session = new NostrLobbySession(this.pool, this.keyPair, {
      roomId,
      isHost: true,
      gameId: options.gameId || "game",
      hostUserId: this.keyPair.publicKey,
      maxPlayers: options.maxPlayers ?? 4,
      metadata: { name: options.name, ...options.metadata },
      nickname: options.nickname || "Gracz"
    });
    return session;
  }
  async joinLobby(roomId, nickname) {
    const session = new NostrLobbySession(this.pool, this.keyPair, {
      roomId,
      isHost: false,
      gameId: "game",
      hostUserId: "",
      nickname: nickname || "Gracz"
    });
    return session;
  }
};

// src/providers/mqtt/MqttProvider.ts
var DEFAULT_MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
var MinimalMqttClient = class {
  constructor(brokerUrl = DEFAULT_MQTT_BROKER, clientId = "mpg_" + Math.random().toString(36).substring(2, 11)) {
    this.brokerUrl = brokerUrl;
    this.clientId = clientId;
  }
  brokerUrl;
  clientId;
  ws = null;
  messageListeners = /* @__PURE__ */ new Set();
  pingInterval = null;
  isConnected = false;
  packetIdCounter = 1;
  async connect() {
    if (typeof WebSocket === "undefined") return;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.brokerUrl, "mqtt");
        this.ws.binaryType = "arraybuffer";
        this.ws.onopen = () => {
          this.sendConnect();
        };
        this.ws.onmessage = (event) => {
          this.handlePacket(new Uint8Array(event.data), resolve);
        };
        this.ws.onerror = (err) => {
          if (!this.isConnected) reject(err);
        };
        this.ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
        };
      } catch (e) {
        reject(e);
      }
    });
  }
  onMessage(cb) {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }
  sendConnect() {
    const protocolName = [0, 4, 77, 81, 84, 84];
    const protocolLevel = 4;
    const connectFlags = 2;
    const keepAlive = [0, 60];
    const clientBytes = new TextEncoder().encode(this.clientId);
    const clientLen = [clientBytes.length >> 8, clientBytes.length & 255];
    const varPayload = [
      ...protocolName,
      protocolLevel,
      connectFlags,
      ...keepAlive,
      ...clientLen,
      ...clientBytes
    ];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([16, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }
  publish(topic, message) {
    const topicBytes = new TextEncoder().encode(topic);
    const topicLen = [topicBytes.length >> 8, topicBytes.length & 255];
    const msgBytes = new TextEncoder().encode(message);
    const varPayload = [...topicLen, ...topicBytes, ...msgBytes];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([48, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }
  subscribe(topic) {
    const pid = this.packetIdCounter++;
    const packetId = [pid >> 8, pid & 255];
    const topicBytes = new TextEncoder().encode(topic);
    const topicLen = [topicBytes.length >> 8, topicBytes.length & 255];
    const qos = 0;
    const varPayload = [...packetId, ...topicLen, ...topicBytes, qos];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([130, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }
  sendRaw(bytes) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes.buffer);
    }
  }
  handlePacket(bytes, onConnected) {
    if (bytes.length === 0) return;
    const packetType = bytes[0] >> 4;
    if (packetType === 2) {
      this.isConnected = true;
      this.pingInterval = setInterval(() => {
        this.sendRaw(new Uint8Array([192, 0]));
      }, 25e3);
      onConnected();
    } else if (packetType === 3) {
      let offset = 1;
      while (bytes[offset] & 128) offset++;
      offset++;
      const topicLen = bytes[offset] << 8 | bytes[offset + 1];
      offset += 2;
      const topic = new TextDecoder().decode(bytes.subarray(offset, offset + topicLen));
      offset += topicLen;
      const payload = new TextDecoder().decode(bytes.subarray(offset));
      this.messageListeners.forEach((cb) => cb(topic, payload));
    }
  }
  encodeLength(len) {
    const out = [];
    do {
      let digit = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) digit |= 128;
      out.push(digit);
    } while (len > 0);
    return out;
  }
  close() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      try {
        this.sendRaw(new Uint8Array([224, 0]));
        this.ws.close();
      } catch {
      }
    }
    this.messageListeners.clear();
  }
};
function topicMatches(pattern, topic) {
  const pParts = pattern.split("/");
  const tParts = topic.split("/");
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i] === "#") return true;
    if (pParts[i] === "+") {
      if (i >= tParts.length) return false;
      continue;
    }
    if (pParts[i] !== tParts[i]) return false;
  }
  return pParts.length === tParts.length;
}
var MqttLobbySession = class extends TypedEventEmitter {
  constructor(mqtt, myUserId, options) {
    super();
    this.mqtt = mqtt;
    this.myUserId = myUserId;
    this.roomId = options.roomId;
    this.isHost = options.isHost;
    this.gameId = options.gameId;
    this.hostUserId = options.hostUserId;
    this._hostPeerId = options.hostPeerId;
    this.maxPlayers = options.maxPlayers ?? 4;
    this.metadata = options.metadata || {};
    this.roomTopic = `mpg/${this.gameId}/room/${this.roomId}/events`;
    this.lobbyTopic = `mpg/${this.gameId}/lobbies/${this.roomId}`;
    this._players.set(myUserId, {
      userId: myUserId,
      nickname: options.nickname,
      isHost: options.isHost,
      isReady: options.isHost,
      peerId: options.hostPeerId
    });
    this.initNetwork();
  }
  mqtt;
  myUserId;
  roomId;
  isHost;
  gameId;
  hostUserId;
  maxPlayers;
  metadata;
  _status = "waiting";
  _hostPeerId;
  _players = /* @__PURE__ */ new Map();
  _chatMessages = [];
  heartbeatTimer = null;
  unsubscribeMessages = null;
  roomTopic;
  lobbyTopic;
  get players() {
    return Array.from(this._players.values());
  }
  get chatMessages() {
    return [...this._chatMessages];
  }
  get status() {
    return this._status;
  }
  get hostPeerId() {
    return this._hostPeerId;
  }
  initNetwork() {
    this.mqtt.subscribe(this.roomTopic);
    this.unsubscribeMessages = this.mqtt.onMessage((topic, payload) => {
      if (topic !== this.roomTopic) return;
      try {
        const msg = JSON.parse(payload);
        this.handleRoomMessage(msg);
      } catch {
      }
    });
    if (this.isHost) {
      this.broadcastLobbyHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.broadcastLobbyHeartbeat();
      }, 5e3);
    } else {
      const self = this._players.get(this.myUserId);
      if (self) {
        this.mqtt.publish(this.roomTopic, JSON.stringify({
          type: "player_update",
          player: self
        }));
      }
    }
  }
  broadcastLobbyHeartbeat() {
    const info = {
      roomId: this.roomId,
      name: this.metadata.name || "MQTT Lobby",
      gameId: this.gameId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || "Host",
      numPlayers: this._players.size,
      maxPlayers: this.maxPlayers,
      status: this._status,
      metadata: { ...this.metadata, hostPeerId: this._hostPeerId }
    };
    this.mqtt.publish(this.lobbyTopic, JSON.stringify(info));
  }
  handleRoomMessage(msg) {
    if (msg.type === "player_update" && msg.player) {
      const p = msg.player;
      const isNew = !this._players.has(p.userId);
      this._players.set(p.userId, p);
      if (p.isHost && p.peerId && p.peerId !== this._hostPeerId) {
        this._hostPeerId = p.peerId;
        this.emit("hostPeerIdAvailable", p.peerId);
      }
      if (isNew) {
        this.emit("playerJoined", p);
        if (this.isHost) {
          const self = this._players.get(this.myUserId);
          if (self) {
            this.mqtt.publish(this.roomTopic, JSON.stringify({
              type: "player_update",
              player: self
            }));
          }
        }
      } else {
        this.emit("playerUpdated", p);
      }
    } else if (msg.type === "chat" && msg.message) {
      const chatMsg = msg.message;
      this._chatMessages.push(chatMsg);
      this.emit("chatMessage", chatMsg);
    } else if (msg.type === "start_game") {
      this._status = "in_game";
      if (msg.hostPeerId) this._hostPeerId = msg.hostPeerId;
      this.emit("gameStarted", {
        hostPeerId: msg.hostPeerId || this._hostPeerId,
        metadata: msg.metadata || {}
      });
    }
  }
  async setReady(ready, data) {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: "player_update",
      player: self
    }));
    this.emit("playerUpdated", self);
  }
  async setPeerId(peerId) {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit("hostPeerIdAvailable", peerId);
      this.broadcastLobbyHeartbeat();
    }
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: "player_update",
      player: self
    }));
  }
  async sendChatMessage(text) {
    const self = this._players.get(this.myUserId);
    const chatMsg = {
      id: Math.random().toString(36).substring(2, 9),
      senderUserId: this.myUserId,
      senderNickname: self?.nickname || "Gracz",
      text,
      timestamp: Date.now()
    };
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: "chat",
      message: chatMsg
    }));
  }
  async startGame(metadata) {
    if (!this.isHost) return;
    this._status = "in_game";
    this.broadcastLobbyHeartbeat();
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: "start_game",
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    }));
    this.emit("gameStarted", {
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
  }
  async leave() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribeMessages) this.unsubscribeMessages();
  }
};
var MqttLobbyProvider = class extends TypedEventEmitter {
  providerType = "mqtt";
  mqtt;
  myUserId;
  _isConnected = false;
  constructor(brokerUrl = DEFAULT_MQTT_BROKER) {
    super();
    this.myUserId = "mqtt_u_" + Math.random().toString(36).substring(2, 10);
    this.mqtt = new MinimalMqttClient(brokerUrl, "mpg_" + this.myUserId);
  }
  get currentUserId() {
    return this.myUserId;
  }
  get isConnected() {
    return this._isConnected;
  }
  async connect() {
    await this.mqtt.connect();
    this._isConnected = true;
    this.emit("connected", void 0);
  }
  async disconnect() {
    this.mqtt.close();
    this._isConnected = false;
    this.emit("disconnected", void 0);
  }
  async listLobbies(gameId) {
    return new Promise((resolve) => {
      const discoveryTopic = `mpg/${gameId}/lobbies/+`;
      this.mqtt.subscribe(discoveryTopic);
      const lobbiesMap = /* @__PURE__ */ new Map();
      const unsubscribe = this.mqtt.onMessage((topic, payload) => {
        if (!topicMatches(discoveryTopic, topic)) return;
        try {
          const info = JSON.parse(payload);
          lobbiesMap.set(info.roomId, { info, receivedAt: Date.now() });
        } catch {
        }
      });
      setTimeout(() => {
        unsubscribe();
        resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
      }, 1200);
    });
  }
  async createLobby(options) {
    const roomId = "mqtt_r_" + Math.random().toString(36).substring(2, 10);
    const session = new MqttLobbySession(this.mqtt, this.myUserId, {
      roomId,
      isHost: true,
      gameId: options.gameId || "game",
      hostUserId: this.myUserId,
      maxPlayers: options.maxPlayers ?? 4,
      metadata: { name: options.name, ...options.metadata },
      nickname: options.nickname || "Host"
    });
    return session;
  }
  async joinLobby(roomId, nickname) {
    const session = new MqttLobbySession(this.mqtt, this.myUserId, {
      roomId,
      isHost: false,
      gameId: "game",
      hostUserId: "",
      nickname: nickname || "Gracz"
    });
    return session;
  }
};

// src/providers/firebase/FirebaseProvider.ts
var FirebaseLobbySession = class extends TypedEventEmitter {
  constructor(databaseURL, myUserId, options) {
    super();
    this.databaseURL = databaseURL;
    this.myUserId = myUserId;
    this.roomId = options.roomId;
    this.isHost = options.isHost;
    this.gameId = options.gameId;
    this.hostUserId = options.hostUserId;
    this._hostPeerId = options.hostPeerId;
    this.maxPlayers = options.maxPlayers ?? 4;
    this.metadata = options.metadata || {};
    this._players.set(myUserId, {
      userId: myUserId,
      nickname: options.nickname,
      isHost: options.isHost,
      isReady: options.isHost,
      peerId: options.hostPeerId
    });
    this.initNetwork();
  }
  databaseURL;
  myUserId;
  roomId;
  isHost;
  gameId;
  hostUserId;
  maxPlayers;
  metadata;
  _status = "waiting";
  _hostPeerId;
  _players = /* @__PURE__ */ new Map();
  _chatMessages = [];
  eventSource = null;
  heartbeatTimer = null;
  get players() {
    return Array.from(this._players.values());
  }
  get chatMessages() {
    return [...this._chatMessages];
  }
  get status() {
    return this._status;
  }
  get hostPeerId() {
    return this._hostPeerId;
  }
  cleanDbUrl() {
    return this.databaseURL.replace(/\/+$/, "");
  }
  initNetwork() {
    const eventsUrl = `${this.cleanDbUrl()}/games/${this.gameId}/rooms/${this.roomId}/events.json`;
    if (typeof EventSource !== "undefined") {
      try {
        this.eventSource = new EventSource(eventsUrl);
        this.eventSource.addEventListener("put", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.data) {
              this.handleRawData(data.data);
            }
          } catch {
          }
        });
      } catch {
      }
    }
    if (this.isHost) {
      this.syncLobbyState();
      this.heartbeatTimer = setInterval(() => this.syncLobbyState(), 6e3);
    } else {
      const self = this._players.get(this.myUserId);
      if (self) {
        this.pushEvent({ type: "player_update", player: self });
      }
    }
  }
  async pushEvent(eventData) {
    const url = `${this.cleanDbUrl()}/games/${this.gameId}/rooms/${this.roomId}/events.json`;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      });
    } catch {
    }
  }
  async syncLobbyState() {
    const lobbyUrl = `${this.cleanDbUrl()}/games/${this.gameId}/lobbies/${this.roomId}.json`;
    const info = {
      roomId: this.roomId,
      name: this.metadata.name || "Firebase Lobby",
      gameId: this.gameId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || "Host",
      numPlayers: this._players.size,
      maxPlayers: this.maxPlayers,
      status: this._status,
      metadata: { ...this.metadata, hostPeerId: this._hostPeerId }
    };
    try {
      await fetch(lobbyUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info)
      });
    } catch {
    }
  }
  handleRawData(data) {
    if (!data) return;
    const items = typeof data === "object" ? Object.values(data) : [];
    for (const msg of items) {
      if (!msg || typeof msg !== "object") continue;
      if (msg.type === "player_update" && msg.player) {
        const p = msg.player;
        const isNew = !this._players.has(p.userId);
        this._players.set(p.userId, p);
        if (p.isHost && p.peerId && p.peerId !== this._hostPeerId) {
          this._hostPeerId = p.peerId;
          this.emit("hostPeerIdAvailable", p.peerId);
        }
        if (isNew) {
          this.emit("playerJoined", p);
        } else {
          this.emit("playerUpdated", p);
        }
      } else if (msg.type === "chat" && msg.message) {
        const chatMsg = msg.message;
        if (!this._chatMessages.some((m) => m.id === chatMsg.id)) {
          this._chatMessages.push(chatMsg);
          this.emit("chatMessage", chatMsg);
        }
      } else if (msg.type === "start_game") {
        this._status = "in_game";
        if (msg.hostPeerId) this._hostPeerId = msg.hostPeerId;
        this.emit("gameStarted", {
          hostPeerId: msg.hostPeerId || this._hostPeerId,
          metadata: msg.metadata || {}
        });
      }
    }
  }
  async setReady(ready, data) {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };
    await this.pushEvent({ type: "player_update", player: self });
    this.emit("playerUpdated", self);
  }
  async setPeerId(peerId) {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit("hostPeerIdAvailable", peerId);
      this.syncLobbyState();
    }
    await this.pushEvent({ type: "player_update", player: self });
  }
  async sendChatMessage(text) {
    const self = this._players.get(this.myUserId);
    const chatMsg = {
      id: Math.random().toString(36).substring(2, 10),
      senderUserId: this.myUserId,
      senderNickname: self?.nickname || "Gracz",
      text,
      timestamp: Date.now()
    };
    await this.pushEvent({ type: "chat", message: chatMsg });
  }
  async startGame(metadata) {
    if (!this.isHost) return;
    this._status = "in_game";
    this.syncLobbyState();
    await this.pushEvent({
      type: "start_game",
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
    this.emit("gameStarted", {
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
  }
  async leave() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
      }
    }
    if (this.isHost) {
      const lobbyUrl = `${this.cleanDbUrl()}/games/${this.gameId}/lobbies/${this.roomId}.json`;
      try {
        await fetch(lobbyUrl, { method: "DELETE" });
      } catch {
      }
    }
  }
};
var FirebaseLobbyProvider = class extends TypedEventEmitter {
  providerType = "firebase";
  databaseURL;
  myUserId;
  _isConnected = false;
  constructor(config) {
    super();
    if (typeof config === "string") {
      this.databaseURL = config;
    } else if (config?.databaseURL) {
      this.databaseURL = config.databaseURL;
    } else {
      this.databaseURL = "https://matrix-peer-game-default-rtdb.firebaseio.com";
    }
    this.myUserId = "fb_u_" + Math.random().toString(36).substring(2, 10);
  }
  get currentUserId() {
    return this.myUserId;
  }
  get isConnected() {
    return this._isConnected;
  }
  cleanDbUrl() {
    return this.databaseURL.replace(/\/+$/, "");
  }
  async connect() {
    this._isConnected = true;
    this.emit("connected", void 0);
  }
  async disconnect() {
    this._isConnected = false;
    this.emit("disconnected", void 0);
  }
  async listLobbies(gameId) {
    const url = `${this.cleanDbUrl()}/games/${gameId}/lobbies.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || typeof data !== "object") return [];
      return Object.values(data);
    } catch {
      return [];
    }
  }
  async createLobby(options) {
    const roomId = "fb_r_" + Math.random().toString(36).substring(2, 10);
    const session = new FirebaseLobbySession(this.databaseURL, this.myUserId, {
      roomId,
      isHost: true,
      gameId: options.gameId || "game",
      hostUserId: this.myUserId,
      maxPlayers: options.maxPlayers ?? 4,
      metadata: { name: options.name, ...options.metadata },
      nickname: options.nickname || "Host"
    });
    return session;
  }
  async joinLobby(roomId, nickname) {
    const session = new FirebaseLobbySession(this.databaseURL, this.myUserId, {
      roomId,
      isHost: false,
      gameId: "game",
      hostUserId: "",
      nickname: nickname || "Gracz"
    });
    return session;
  }
};

// src/core/GameNetClient.ts
var GameNetClient = class extends TypedEventEmitter {
  providerType;
  lobbyProvider;
  matrix;
  gameId;
  peerConfig;
  currentLobby = null;
  peerManager = null;
  constructor(options = {}) {
    super();
    this.gameId = options.gameId || "matrix-peer-game";
    this.providerType = options.provider || "matrix";
    this.peerConfig = options.peerConfig;
    if (this.providerType === "nostr") {
      const p = new NostrLobbyProvider(options.nostrRelays);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || "https://matrix.org");
      p.connect().catch(() => {
      });
    } else if (this.providerType === "mqtt") {
      const p = new MqttLobbyProvider(options.mqttBroker);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || "https://matrix.org");
      p.connect().catch(() => {
      });
    } else if (this.providerType === "firebase") {
      const p = new FirebaseLobbyProvider(options.firebaseConfig);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || "https://matrix.org");
      p.connect().catch(() => {
      });
    } else {
      const p = new MatrixLobbyProvider(options.homeserver || "https://matrix.org");
      this.lobbyProvider = p;
      this.matrix = p.matrix;
      this.setupMatrixEvents();
    }
    this.lobbyProvider.on("error", (err) => {
      this.emit("error", err);
    });
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
    return this.lobbyProvider.currentUserId || this.matrix.currentUserId;
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
   * Log in using an existing Matrix Access Token (retrieves userId automatically)
   */
  async loginWithToken(accessToken, userId) {
    const auth = await this.matrix.loginWithToken(accessToken, userId);
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
   * Register a new user account with username and password
   */
  async registerUser(username, password, nickname) {
    const auth = await this.matrix.registerUser(username, password, nickname);
    this.matrix.startSync();
    this.emit("authenticated", auth);
    return auth;
  }
  /**
   * Save current authentication to localStorage
   */
  saveSession(key = "matrix_peer_game_auth") {
    if (!this.matrix.currentAuth) return false;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(this.matrix.currentAuth));
        return true;
      }
    } catch {
    }
    return false;
  }
  /**
   * Automatically restore session from localStorage if available
   */
  autoLogin(key = "matrix_peer_game_auth") {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(key);
        if (stored) {
          const auth = JSON.parse(stored);
          if (auth.accessToken && auth.userId) {
            this.restoreSession(auth);
            return true;
          }
        }
      }
    } catch {
    }
    return false;
  }
  /**
   * Clear session from localStorage
   */
  clearSession(key = "matrix_peer_game_auth") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
    }
  }
  /**
   * List available public game lobbies for this game
   */
  async listLobbies(_limit = 20) {
    return this.lobbyProvider.listLobbies(this.gameId);
  }
  /**
   * Create a new multiplayer game lobby
   */
  async createLobby(options) {
    const lobby = await this.lobbyProvider.createLobby({
      name: options.name,
      topic: options.topic,
      gameId: this.gameId,
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata,
      nickname: options.nickname
    });
    this.currentLobby = lobby;
    this.initPeerNetwork(true);
    this.emit("lobbyJoined", lobby);
    return lobby;
  }
  /**
   * Join an existing lobby room by its room ID
   */
  async joinLobby(roomIdOrAlias, nickname) {
    const lobby = await this.lobbyProvider.joinLobby(roomIdOrAlias, nickname);
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
var nOmniPeer = {
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
  SharedStateEngine,
  MatrixLobbyProvider,
  NostrLobbyProvider,
  MqttLobbyProvider,
  FirebaseLobbyProvider
};
var MatrixPeerGame = nOmniPeer;
if (typeof window !== "undefined") {
  window.nOmniPeer = nOmniPeer;
  window.MatrixPeerGame = nOmniPeer;
}
var index_default = nOmniPeer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Client,
  DEFAULT_MQTT_BROKER,
  DEFAULT_NOSTR_RELAYS,
  FirebaseLobbyProvider,
  GameNetClient,
  LobbyDiscovery,
  LobbyRoom,
  LockstepEngine,
  MatrixClient,
  MatrixLobbyProvider,
  MatrixPeerGame,
  MqttLobbyProvider,
  NostrLobbyProvider,
  PacketSerializer,
  PacketType,
  PeerManager,
  RealtimeEngine,
  SharedStateEngine,
  TurnBasedEngine,
  TypedEventEmitter,
  nOmniPeer
});
//# sourceMappingURL=index.js.map