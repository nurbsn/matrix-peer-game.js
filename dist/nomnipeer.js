"use strict";
var nOmniPeer = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
  };
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
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // node_modules/sdp/sdp.js
  var require_sdp = __commonJS({
    "node_modules/sdp/sdp.js"(exports, module) {
      "use strict";
      var SDPUtils2 = {};
      SDPUtils2.generateIdentifier = function() {
        return Math.random().toString(36).substring(2, 12);
      };
      SDPUtils2.localCName = SDPUtils2.generateIdentifier();
      SDPUtils2.splitLines = function(blob) {
        return blob.trim().split("\n").map((line) => line.trim());
      };
      SDPUtils2.splitSections = function(blob) {
        const parts = blob.split("\nm=");
        return parts.map((part, index) => (index > 0 ? "m=" + part : part).trim() + "\r\n");
      };
      SDPUtils2.getDescription = function(blob) {
        const sections = SDPUtils2.splitSections(blob);
        return sections && sections[0];
      };
      SDPUtils2.getMediaSections = function(blob) {
        const sections = SDPUtils2.splitSections(blob);
        sections.shift();
        return sections;
      };
      SDPUtils2.matchPrefix = function(blob, prefix) {
        return SDPUtils2.splitLines(blob).filter((line) => line.indexOf(prefix) === 0);
      };
      SDPUtils2.parseCandidate = function(line) {
        let parts;
        if (line.indexOf("a=candidate:") === 0) {
          parts = line.substring(12).split(" ");
        } else {
          parts = line.substring(10).split(" ");
        }
        const candidate = {
          foundation: parts[0],
          component: { 1: "rtp", 2: "rtcp" }[parts[1]] || parts[1],
          protocol: parts[2].toLowerCase(),
          priority: parseInt(parts[3], 10),
          ip: parts[4],
          address: parts[4],
          // address is an alias for ip.
          port: parseInt(parts[5], 10),
          // skip parts[6] == 'typ'
          type: parts[7]
        };
        for (let i = 8; i < parts.length; i += 2) {
          switch (parts[i]) {
            case "raddr":
              candidate.relatedAddress = parts[i + 1];
              break;
            case "rport":
              candidate.relatedPort = parseInt(parts[i + 1], 10);
              break;
            case "tcptype":
              candidate.tcpType = parts[i + 1];
              break;
            case "ufrag":
              candidate.ufrag = parts[i + 1];
              candidate.usernameFragment = parts[i + 1];
              break;
            default:
              if (candidate[parts[i]] === void 0) {
                candidate[parts[i]] = parts[i + 1];
              }
              break;
          }
        }
        return candidate;
      };
      SDPUtils2.writeCandidate = function(candidate) {
        const sdp2 = [];
        sdp2.push(candidate.foundation);
        const component = candidate.component;
        if (component === "rtp") {
          sdp2.push(1);
        } else if (component === "rtcp") {
          sdp2.push(2);
        } else {
          sdp2.push(component);
        }
        sdp2.push(candidate.protocol.toUpperCase());
        sdp2.push(candidate.priority);
        sdp2.push(candidate.address || candidate.ip);
        sdp2.push(candidate.port);
        const type = candidate.type;
        sdp2.push("typ");
        sdp2.push(type);
        if (type !== "host" && candidate.relatedAddress && candidate.relatedPort !== void 0) {
          sdp2.push("raddr");
          sdp2.push(candidate.relatedAddress);
          sdp2.push("rport");
          sdp2.push(candidate.relatedPort);
        }
        if (candidate.tcpType && candidate.protocol.toLowerCase() === "tcp") {
          sdp2.push("tcptype");
          sdp2.push(candidate.tcpType);
        }
        if (candidate.usernameFragment || candidate.ufrag) {
          sdp2.push("ufrag");
          sdp2.push(candidate.usernameFragment || candidate.ufrag);
        }
        return "candidate:" + sdp2.join(" ");
      };
      SDPUtils2.parseIceOptions = function(line) {
        return line.substring(14).split(" ");
      };
      SDPUtils2.parseRtpMap = function(line) {
        let parts = line.substring(9).split(" ");
        const parsed = {
          payloadType: parseInt(parts.shift(), 10)
          // was: id
        };
        parts = parts[0].split("/");
        parsed.name = parts[0];
        parsed.clockRate = parseInt(parts[1], 10);
        parsed.channels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
        parsed.numChannels = parsed.channels;
        return parsed;
      };
      SDPUtils2.writeRtpMap = function(codec) {
        let pt = codec.payloadType;
        if (codec.preferredPayloadType !== void 0) {
          pt = codec.preferredPayloadType;
        }
        const channels = codec.channels || codec.numChannels || 1;
        return "a=rtpmap:" + pt + " " + codec.name + "/" + codec.clockRate + (channels !== 1 ? "/" + channels : "") + "\r\n";
      };
      SDPUtils2.parseExtmap = function(line) {
        const parts = line.substring(9).split(" ");
        return {
          id: parseInt(parts[0], 10),
          direction: parts[0].indexOf("/") > 0 ? parts[0].split("/")[1] : "sendrecv",
          uri: parts[1],
          attributes: parts.slice(2).join(" ")
        };
      };
      SDPUtils2.writeExtmap = function(headerExtension) {
        return "a=extmap:" + (headerExtension.id || headerExtension.preferredId) + (headerExtension.direction && headerExtension.direction !== "sendrecv" ? "/" + headerExtension.direction : "") + " " + headerExtension.uri + (headerExtension.attributes ? " " + headerExtension.attributes : "") + "\r\n";
      };
      SDPUtils2.parseFmtp = function(line) {
        const parsed = {};
        let kv;
        const parts = line.substring(line.indexOf(" ") + 1).split(";");
        for (let j = 0; j < parts.length; j++) {
          kv = parts[j].trim().split("=");
          parsed[kv[0].trim()] = kv[1];
        }
        return parsed;
      };
      SDPUtils2.writeFmtp = function(codec) {
        let line = "";
        let pt = codec.payloadType;
        if (codec.preferredPayloadType !== void 0) {
          pt = codec.preferredPayloadType;
        }
        if (codec.parameters && Object.keys(codec.parameters).length) {
          const params = [];
          Object.keys(codec.parameters).forEach((param) => {
            if (codec.parameters[param] !== void 0) {
              params.push(param + "=" + codec.parameters[param]);
            } else {
              params.push(param);
            }
          });
          line += "a=fmtp:" + pt + " " + params.join(";") + "\r\n";
        }
        return line;
      };
      SDPUtils2.parseRtcpFb = function(line) {
        const parts = line.substring(line.indexOf(" ") + 1).split(" ");
        return {
          type: parts.shift(),
          parameter: parts.join(" ")
        };
      };
      SDPUtils2.writeRtcpFb = function(codec) {
        let lines = "";
        let pt = codec.payloadType;
        if (codec.preferredPayloadType !== void 0) {
          pt = codec.preferredPayloadType;
        }
        if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
          codec.rtcpFeedback.forEach((fb) => {
            lines += "a=rtcp-fb:" + pt + " " + fb.type + (fb.parameter && fb.parameter.length ? " " + fb.parameter : "") + "\r\n";
          });
        }
        return lines;
      };
      SDPUtils2.parseSsrcMedia = function(line) {
        const sp = line.indexOf(" ");
        const parts = {
          ssrc: parseInt(line.substring(7, sp), 10)
        };
        const colon = line.indexOf(":", sp);
        if (colon > -1) {
          parts.attribute = line.substring(sp + 1, colon);
          parts.value = line.substring(colon + 1);
        } else {
          parts.attribute = line.substring(sp + 1);
        }
        return parts;
      };
      SDPUtils2.parseSsrcGroup = function(line) {
        const parts = line.substring(13).split(" ");
        return {
          semantics: parts.shift(),
          ssrcs: parts.map((ssrc) => parseInt(ssrc, 10))
        };
      };
      SDPUtils2.getMid = function(mediaSection) {
        const mid = SDPUtils2.matchPrefix(mediaSection, "a=mid:")[0];
        if (mid) {
          return mid.substring(6);
        }
      };
      SDPUtils2.parseFingerprint = function(line) {
        const parts = line.substring(14).split(" ");
        return {
          algorithm: parts[0].toLowerCase(),
          // algorithm is case-sensitive in Edge.
          value: parts[1].toUpperCase()
          // the definition is upper-case in RFC 4572.
        };
      };
      SDPUtils2.getDtlsParameters = function(mediaSection, sessionpart) {
        const lines = SDPUtils2.matchPrefix(
          mediaSection + sessionpart,
          "a=fingerprint:"
        );
        return {
          role: "auto",
          fingerprints: lines.map(SDPUtils2.parseFingerprint)
        };
      };
      SDPUtils2.writeDtlsParameters = function(params, setupType) {
        let sdp2 = "a=setup:" + setupType + "\r\n";
        params.fingerprints.forEach((fp) => {
          sdp2 += "a=fingerprint:" + fp.algorithm + " " + fp.value + "\r\n";
        });
        return sdp2;
      };
      SDPUtils2.parseCryptoLine = function(line) {
        const parts = line.substring(9).split(" ");
        return {
          tag: parseInt(parts[0], 10),
          cryptoSuite: parts[1],
          keyParams: parts[2],
          sessionParams: parts.slice(3)
        };
      };
      SDPUtils2.writeCryptoLine = function(parameters) {
        return "a=crypto:" + parameters.tag + " " + parameters.cryptoSuite + " " + (typeof parameters.keyParams === "object" ? SDPUtils2.writeCryptoKeyParams(parameters.keyParams) : parameters.keyParams) + (parameters.sessionParams ? " " + parameters.sessionParams.join(" ") : "") + "\r\n";
      };
      SDPUtils2.parseCryptoKeyParams = function(keyParams) {
        if (keyParams.indexOf("inline:") !== 0) {
          return null;
        }
        const parts = keyParams.substring(7).split("|");
        return {
          keyMethod: "inline",
          keySalt: parts[0],
          lifeTime: parts[1],
          mkiValue: parts[2] ? parts[2].split(":")[0] : void 0,
          mkiLength: parts[2] ? parts[2].split(":")[1] : void 0
        };
      };
      SDPUtils2.writeCryptoKeyParams = function(keyParams) {
        return keyParams.keyMethod + ":" + keyParams.keySalt + (keyParams.lifeTime ? "|" + keyParams.lifeTime : "") + (keyParams.mkiValue && keyParams.mkiLength ? "|" + keyParams.mkiValue + ":" + keyParams.mkiLength : "");
      };
      SDPUtils2.getCryptoParameters = function(mediaSection, sessionpart) {
        const lines = SDPUtils2.matchPrefix(
          mediaSection + sessionpart,
          "a=crypto:"
        );
        return lines.map(SDPUtils2.parseCryptoLine);
      };
      SDPUtils2.getIceParameters = function(mediaSection, sessionpart) {
        const ufrag = SDPUtils2.matchPrefix(
          mediaSection + sessionpart,
          "a=ice-ufrag:"
        )[0];
        const pwd = SDPUtils2.matchPrefix(
          mediaSection + sessionpart,
          "a=ice-pwd:"
        )[0];
        if (!(ufrag && pwd)) {
          return null;
        }
        return {
          usernameFragment: ufrag.substring(12),
          password: pwd.substring(10)
        };
      };
      SDPUtils2.writeIceParameters = function(params) {
        let sdp2 = "a=ice-ufrag:" + params.usernameFragment + "\r\na=ice-pwd:" + params.password + "\r\n";
        if (params.iceLite) {
          sdp2 += "a=ice-lite\r\n";
        }
        return sdp2;
      };
      SDPUtils2.parseRtpParameters = function(mediaSection) {
        const description = {
          codecs: [],
          headerExtensions: [],
          fecMechanisms: [],
          rtcp: []
        };
        const lines = SDPUtils2.splitLines(mediaSection);
        const mline = lines[0].split(" ");
        description.profile = mline[2];
        for (let i = 3; i < mline.length; i++) {
          const pt = mline[i];
          const rtpmapline = SDPUtils2.matchPrefix(
            mediaSection,
            "a=rtpmap:" + pt + " "
          )[0];
          if (rtpmapline) {
            const codec = SDPUtils2.parseRtpMap(rtpmapline);
            const fmtps = SDPUtils2.matchPrefix(
              mediaSection,
              "a=fmtp:" + pt + " "
            );
            codec.parameters = fmtps.length ? SDPUtils2.parseFmtp(fmtps[0]) : {};
            codec.rtcpFeedback = SDPUtils2.matchPrefix(
              mediaSection,
              "a=rtcp-fb:" + pt + " "
            ).map(SDPUtils2.parseRtcpFb);
            description.codecs.push(codec);
            switch (codec.name.toUpperCase()) {
              case "RED":
              case "ULPFEC":
                description.fecMechanisms.push(codec.name.toUpperCase());
                break;
              default:
                break;
            }
          }
        }
        SDPUtils2.matchPrefix(mediaSection, "a=extmap:").forEach((line) => {
          description.headerExtensions.push(SDPUtils2.parseExtmap(line));
        });
        const wildcardRtcpFb = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-fb:* ").map(SDPUtils2.parseRtcpFb);
        description.codecs.forEach((codec) => {
          wildcardRtcpFb.forEach((fb) => {
            const duplicate = codec.rtcpFeedback.find((existingFeedback) => {
              return existingFeedback.type === fb.type && existingFeedback.parameter === fb.parameter;
            });
            if (!duplicate) {
              codec.rtcpFeedback.push(fb);
            }
          });
        });
        return description;
      };
      SDPUtils2.writeRtpDescription = function(kind, caps) {
        let sdp2 = "";
        sdp2 += "m=" + kind + " ";
        sdp2 += caps.codecs.length > 0 ? "9" : "0";
        sdp2 += " " + (caps.profile || "UDP/TLS/RTP/SAVPF") + " ";
        sdp2 += caps.codecs.map((codec) => {
          if (codec.preferredPayloadType !== void 0) {
            return codec.preferredPayloadType;
          }
          return codec.payloadType;
        }).join(" ") + "\r\n";
        sdp2 += "c=IN IP4 0.0.0.0\r\n";
        sdp2 += "a=rtcp:9 IN IP4 0.0.0.0\r\n";
        caps.codecs.forEach((codec) => {
          sdp2 += SDPUtils2.writeRtpMap(codec);
          sdp2 += SDPUtils2.writeFmtp(codec);
          sdp2 += SDPUtils2.writeRtcpFb(codec);
        });
        let maxptime = 0;
        caps.codecs.forEach((codec) => {
          if (codec.maxptime > maxptime) {
            maxptime = codec.maxptime;
          }
        });
        if (maxptime > 0) {
          sdp2 += "a=maxptime:" + maxptime + "\r\n";
        }
        if (caps.headerExtensions) {
          caps.headerExtensions.forEach((extension) => {
            sdp2 += SDPUtils2.writeExtmap(extension);
          });
        }
        return sdp2;
      };
      SDPUtils2.parseRtpEncodingParameters = function(mediaSection) {
        const encodingParameters = [];
        const description = SDPUtils2.parseRtpParameters(mediaSection);
        const hasRed = description.fecMechanisms.indexOf("RED") !== -1;
        const hasUlpfec = description.fecMechanisms.indexOf("ULPFEC") !== -1;
        const ssrcs = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((parts) => parts.attribute === "cname");
        const primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
        let secondarySsrc;
        const flows = SDPUtils2.matchPrefix(mediaSection, "a=ssrc-group:FID").map((line) => {
          const parts = line.substring(17).split(" ");
          return parts.map((part) => parseInt(part, 10));
        });
        if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
          secondarySsrc = flows[0][1];
        }
        description.codecs.forEach((codec) => {
          if (codec.name.toUpperCase() === "RTX" && codec.parameters.apt) {
            let encParam = {
              ssrc: primarySsrc,
              codecPayloadType: parseInt(codec.parameters.apt, 10)
            };
            if (primarySsrc && secondarySsrc) {
              encParam.rtx = { ssrc: secondarySsrc };
            }
            encodingParameters.push(encParam);
            if (hasRed) {
              encParam = JSON.parse(JSON.stringify(encParam));
              encParam.fec = {
                ssrc: primarySsrc,
                mechanism: hasUlpfec ? "red+ulpfec" : "red"
              };
              encodingParameters.push(encParam);
            }
          }
        });
        if (encodingParameters.length === 0 && primarySsrc) {
          encodingParameters.push({
            ssrc: primarySsrc
          });
        }
        let bandwidth = SDPUtils2.matchPrefix(mediaSection, "b=");
        if (bandwidth.length) {
          if (bandwidth[0].indexOf("b=TIAS:") === 0) {
            bandwidth = parseInt(bandwidth[0].substring(7), 10);
          } else if (bandwidth[0].indexOf("b=AS:") === 0) {
            bandwidth = parseInt(bandwidth[0].substring(5), 10) * 1e3 * 0.95 - 50 * 40 * 8;
          } else {
            bandwidth = void 0;
          }
          encodingParameters.forEach((params) => {
            params.maxBitrate = bandwidth;
          });
        }
        return encodingParameters;
      };
      SDPUtils2.parseRtcpParameters = function(mediaSection) {
        const rtcpParameters = {};
        const remoteSsrc = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((obj) => obj.attribute === "cname")[0];
        if (remoteSsrc) {
          rtcpParameters.cname = remoteSsrc.value;
          rtcpParameters.ssrc = remoteSsrc.ssrc;
        }
        const rsize = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-rsize");
        rtcpParameters.reducedSize = rsize.length > 0;
        rtcpParameters.compound = rsize.length === 0;
        const mux = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-mux");
        rtcpParameters.mux = mux.length > 0;
        return rtcpParameters;
      };
      SDPUtils2.writeRtcpParameters = function(rtcpParameters) {
        let sdp2 = "";
        if (rtcpParameters.reducedSize) {
          sdp2 += "a=rtcp-rsize\r\n";
        }
        if (rtcpParameters.mux) {
          sdp2 += "a=rtcp-mux\r\n";
        }
        if (rtcpParameters.ssrc !== void 0 && rtcpParameters.cname) {
          sdp2 += "a=ssrc:" + rtcpParameters.ssrc + " cname:" + rtcpParameters.cname + "\r\n";
        }
        return sdp2;
      };
      SDPUtils2.parseMsid = function(mediaSection) {
        let parts;
        const spec = SDPUtils2.matchPrefix(mediaSection, "a=msid:");
        if (spec.length === 1) {
          parts = spec[0].substring(7).split(" ");
          return { stream: parts[0], track: parts[1] };
        }
        const planB = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((msidParts) => msidParts.attribute === "msid");
        if (planB.length > 0) {
          parts = planB[0].value.split(" ");
          return { stream: parts[0], track: parts[1] };
        }
      };
      SDPUtils2.parseSctpDescription = function(mediaSection) {
        const mline = SDPUtils2.parseMLine(mediaSection);
        const maxSizeLine = SDPUtils2.matchPrefix(mediaSection, "a=max-message-size:");
        let maxMessageSize;
        if (maxSizeLine.length > 0) {
          maxMessageSize = parseInt(maxSizeLine[0].substring(19), 10);
        }
        if (isNaN(maxMessageSize)) {
          maxMessageSize = 65536;
        }
        const sctpPort = SDPUtils2.matchPrefix(mediaSection, "a=sctp-port:");
        if (sctpPort.length > 0) {
          return {
            port: parseInt(sctpPort[0].substring(12), 10),
            protocol: mline.fmt,
            maxMessageSize
          };
        }
        const sctpMapLines = SDPUtils2.matchPrefix(mediaSection, "a=sctpmap:");
        if (sctpMapLines.length > 0) {
          const parts = sctpMapLines[0].substring(10).split(" ");
          return {
            port: parseInt(parts[0], 10),
            protocol: parts[1],
            maxMessageSize
          };
        }
      };
      SDPUtils2.writeSctpDescription = function(media, sctp) {
        let output = [];
        if (media.protocol !== "DTLS/SCTP") {
          output = [
            "m=" + media.kind + " 9 " + media.protocol + " " + sctp.protocol + "\r\n",
            "c=IN IP4 0.0.0.0\r\n",
            "a=sctp-port:" + sctp.port + "\r\n"
          ];
        } else {
          output = [
            "m=" + media.kind + " 9 " + media.protocol + " " + sctp.port + "\r\n",
            "c=IN IP4 0.0.0.0\r\n",
            "a=sctpmap:" + sctp.port + " " + sctp.protocol + " 65535\r\n"
          ];
        }
        if (sctp.maxMessageSize !== void 0) {
          output.push("a=max-message-size:" + sctp.maxMessageSize + "\r\n");
        }
        return output.join("");
      };
      SDPUtils2.generateSessionId = function() {
        return Math.random().toString().substr(2, 22);
      };
      SDPUtils2.writeSessionBoilerplate = function(sessId, sessVer, sessUser) {
        let sessionId;
        const version = sessVer !== void 0 ? sessVer : 2;
        if (sessId) {
          sessionId = sessId;
        } else {
          sessionId = SDPUtils2.generateSessionId();
        }
        const user = sessUser || "thisisadapterortc";
        return "v=0\r\no=" + user + " " + sessionId + " " + version + " IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";
      };
      SDPUtils2.getDirection = function(mediaSection, sessionpart) {
        const lines = SDPUtils2.splitLines(mediaSection);
        for (let i = 0; i < lines.length; i++) {
          switch (lines[i]) {
            case "a=sendrecv":
            case "a=sendonly":
            case "a=recvonly":
            case "a=inactive":
              return lines[i].substring(2);
            default:
          }
        }
        if (sessionpart) {
          return SDPUtils2.getDirection(sessionpart);
        }
        return "sendrecv";
      };
      SDPUtils2.getKind = function(mediaSection) {
        const lines = SDPUtils2.splitLines(mediaSection);
        const mline = lines[0].split(" ");
        return mline[0].substring(2);
      };
      SDPUtils2.isRejected = function(mediaSection) {
        return mediaSection.split(" ", 2)[1] === "0";
      };
      SDPUtils2.parseMLine = function(mediaSection) {
        const lines = SDPUtils2.splitLines(mediaSection);
        const parts = lines[0].substring(2).split(" ");
        return {
          kind: parts[0],
          port: parseInt(parts[1], 10),
          protocol: parts[2],
          fmt: parts.slice(3).join(" ")
        };
      };
      SDPUtils2.parseOLine = function(mediaSection) {
        const line = SDPUtils2.matchPrefix(mediaSection, "o=")[0];
        const parts = line.substring(2).split(" ");
        return {
          username: parts[0],
          sessionId: parts[1],
          sessionVersion: parseInt(parts[2], 10),
          netType: parts[3],
          addressType: parts[4],
          address: parts[5]
        };
      };
      SDPUtils2.isValidSDP = function(blob) {
        if (typeof blob !== "string" || blob.length === 0) {
          return false;
        }
        const lines = SDPUtils2.splitLines(blob);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].length < 2 || lines[i].charAt(1) !== "=") {
            return false;
          }
        }
        return true;
      };
      if (typeof module === "object") {
        module.exports = SDPUtils2;
      }
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
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
    default: () => src_default,
    nOmniPeer: () => nOmniPeer
  });

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
    /**
     * Set user account data (arbitrary JSON attached to the user's Matrix account)
     * Matrix spec: PUT /_matrix/client/v3/user/{userId}/account_data/{type}
     */
    async setAccountData(type, data) {
      if (!this.auth) throw new Error("Not authenticated to Matrix");
      const encodedUser = encodeURIComponent(this.auth.userId);
      const encodedType = encodeURIComponent(type);
      await this.request(
        `/_matrix/client/v3/user/${encodedUser}/account_data/${encodedType}`,
        "PUT",
        data
      );
    }
    /**
     * Get user account data
     * Matrix spec: GET /_matrix/client/v3/user/{userId}/account_data/{type}
     */
    async getAccountData(type) {
      if (!this.auth) throw new Error("Not authenticated to Matrix");
      const encodedUser = encodeURIComponent(this.auth.userId);
      const encodedType = encodeURIComponent(type);
      try {
        const res = await this.request(
          `/_matrix/client/v3/user/${encodedUser}/account_data/${encodedType}`,
          "GET"
        );
        return res;
      } catch {
        return null;
      }
    }
  };

  // node_modules/peerjs-js-binarypack/dist/binarypack.mjs
  var $e8379818650e2442$export$93654d4f2d6cd524 = class {
    constructor() {
      this.encoder = new TextEncoder();
      this._pieces = [];
      this._parts = [];
    }
    append_buffer(data) {
      this.flush();
      this._parts.push(data);
    }
    append(data) {
      this._pieces.push(data);
    }
    flush() {
      if (this._pieces.length > 0) {
        const buf = new Uint8Array(this._pieces);
        this._parts.push(buf);
        this._pieces = [];
      }
    }
    toArrayBuffer() {
      const buffer = [];
      for (const part of this._parts) buffer.push(part);
      return $e8379818650e2442$var$concatArrayBuffers(buffer).buffer;
    }
  };
  function $e8379818650e2442$var$concatArrayBuffers(bufs) {
    let size = 0;
    for (const buf of bufs) size += buf.byteLength;
    const result = new Uint8Array(size);
    let offset = 0;
    for (const buf of bufs) {
      const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      result.set(view, offset);
      offset += buf.byteLength;
    }
    return result;
  }
  function $0cfd7828ad59115f$export$417857010dc9287f(data) {
    const unpacker = new $0cfd7828ad59115f$var$Unpacker(data);
    return unpacker.unpack();
  }
  function $0cfd7828ad59115f$export$2a703dbb0cb35339(data) {
    const packer = new $0cfd7828ad59115f$export$b9ec4b114aa40074();
    const res = packer.pack(data);
    if (res instanceof Promise) return res.then(() => packer.getBuffer());
    return packer.getBuffer();
  }
  var $0cfd7828ad59115f$var$Unpacker = class {
    constructor(data) {
      this.index = 0;
      this.dataBuffer = data;
      this.dataView = new Uint8Array(this.dataBuffer);
      this.length = this.dataBuffer.byteLength;
    }
    unpack() {
      const type = this.unpack_uint8();
      if (type < 128) return type;
      else if ((type ^ 224) < 32) return (type ^ 224) - 32;
      let size;
      if ((size = type ^ 160) <= 15) return this.unpack_raw(size);
      else if ((size = type ^ 176) <= 15) return this.unpack_string(size);
      else if ((size = type ^ 144) <= 15) return this.unpack_array(size);
      else if ((size = type ^ 128) <= 15) return this.unpack_map(size);
      switch (type) {
        case 192:
          return null;
        case 193:
          return void 0;
        case 194:
          return false;
        case 195:
          return true;
        case 202:
          return this.unpack_float();
        case 203:
          return this.unpack_double();
        case 204:
          return this.unpack_uint8();
        case 205:
          return this.unpack_uint16();
        case 206:
          return this.unpack_uint32();
        case 207:
          return this.unpack_uint64();
        case 208:
          return this.unpack_int8();
        case 209:
          return this.unpack_int16();
        case 210:
          return this.unpack_int32();
        case 211:
          return this.unpack_int64();
        case 212:
          return void 0;
        case 213:
          return void 0;
        case 214:
          return void 0;
        case 215:
          return void 0;
        case 216:
          size = this.unpack_uint16();
          return this.unpack_string(size);
        case 217:
          size = this.unpack_uint32();
          return this.unpack_string(size);
        case 218:
          size = this.unpack_uint16();
          return this.unpack_raw(size);
        case 219:
          size = this.unpack_uint32();
          return this.unpack_raw(size);
        case 220:
          size = this.unpack_uint16();
          return this.unpack_array(size);
        case 221:
          size = this.unpack_uint32();
          return this.unpack_array(size);
        case 222:
          size = this.unpack_uint16();
          return this.unpack_map(size);
        case 223:
          size = this.unpack_uint32();
          return this.unpack_map(size);
      }
    }
    unpack_uint8() {
      const byte = this.dataView[this.index] & 255;
      this.index++;
      return byte;
    }
    unpack_uint16() {
      const bytes = this.read(2);
      const uint16 = (bytes[0] & 255) * 256 + (bytes[1] & 255);
      this.index += 2;
      return uint16;
    }
    unpack_uint32() {
      const bytes = this.read(4);
      const uint32 = ((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3];
      this.index += 4;
      return uint32;
    }
    unpack_uint64() {
      const bytes = this.read(8);
      const uint64 = ((((((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3]) * 256 + bytes[4]) * 256 + bytes[5]) * 256 + bytes[6]) * 256 + bytes[7];
      this.index += 8;
      return uint64;
    }
    unpack_int8() {
      const uint8 = this.unpack_uint8();
      return uint8 < 128 ? uint8 : uint8 - 256;
    }
    unpack_int16() {
      const uint16 = this.unpack_uint16();
      return uint16 < 32768 ? uint16 : uint16 - 65536;
    }
    unpack_int32() {
      const uint32 = this.unpack_uint32();
      return uint32 < 2 ** 31 ? uint32 : uint32 - 2 ** 32;
    }
    unpack_int64() {
      const uint64 = this.unpack_uint64();
      return uint64 < 2 ** 63 ? uint64 : uint64 - 2 ** 64;
    }
    unpack_raw(size) {
      if (this.length < this.index + size) throw new Error(`BinaryPackFailure: index is out of range ${this.index} ${size} ${this.length}`);
      const buf = this.dataBuffer.slice(this.index, this.index + size);
      this.index += size;
      return buf;
    }
    unpack_string(size) {
      const bytes = this.read(size);
      let i = 0;
      let str = "";
      let c;
      let code;
      while (i < size) {
        c = bytes[i];
        if (c < 160) {
          code = c;
          i++;
        } else if ((c ^ 192) < 32) {
          code = (c & 31) << 6 | bytes[i + 1] & 63;
          i += 2;
        } else if ((c ^ 224) < 16) {
          code = (c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63;
          i += 3;
        } else {
          code = (c & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63;
          i += 4;
        }
        str += String.fromCodePoint(code);
      }
      this.index += size;
      return str;
    }
    unpack_array(size) {
      const objects = new Array(size);
      for (let i = 0; i < size; i++) objects[i] = this.unpack();
      return objects;
    }
    unpack_map(size) {
      const map = {};
      for (let i = 0; i < size; i++) {
        const key = this.unpack();
        map[key] = this.unpack();
      }
      return map;
    }
    unpack_float() {
      const uint32 = this.unpack_uint32();
      const sign = uint32 >> 31;
      const exp = (uint32 >> 23 & 255) - 127;
      const fraction = uint32 & 8388607 | 8388608;
      return (sign === 0 ? 1 : -1) * fraction * 2 ** (exp - 23);
    }
    unpack_double() {
      const h32 = this.unpack_uint32();
      const l32 = this.unpack_uint32();
      const sign = h32 >> 31;
      const exp = (h32 >> 20 & 2047) - 1023;
      const hfrac = h32 & 1048575 | 1048576;
      const frac = hfrac * 2 ** (exp - 20) + l32 * 2 ** (exp - 52);
      return (sign === 0 ? 1 : -1) * frac;
    }
    read(length) {
      const j = this.index;
      if (j + length <= this.length) return this.dataView.subarray(j, j + length);
      else throw new Error("BinaryPackFailure: read index out of range");
    }
  };
  var $0cfd7828ad59115f$export$b9ec4b114aa40074 = class {
    getBuffer() {
      return this._bufferBuilder.toArrayBuffer();
    }
    pack(value) {
      if (typeof value === "string") this.pack_string(value);
      else if (typeof value === "number") {
        if (Math.floor(value) === value) this.pack_integer(value);
        else this.pack_double(value);
      } else if (typeof value === "boolean") {
        if (value === true) this._bufferBuilder.append(195);
        else if (value === false) this._bufferBuilder.append(194);
      } else if (value === void 0) this._bufferBuilder.append(192);
      else if (typeof value === "object") {
        if (value === null) this._bufferBuilder.append(192);
        else {
          const constructor = value.constructor;
          if (value instanceof Array) {
            const res = this.pack_array(value);
            if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
          } else if (value instanceof ArrayBuffer) this.pack_bin(new Uint8Array(value));
          else if ("BYTES_PER_ELEMENT" in value) {
            const v = value;
            this.pack_bin(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
          } else if (value instanceof Date) this.pack_string(value.toString());
          else if (value instanceof Blob) return value.arrayBuffer().then((buffer) => {
            this.pack_bin(new Uint8Array(buffer));
            this._bufferBuilder.flush();
          });
          else if (constructor == Object || constructor.toString().startsWith("class")) {
            const res = this.pack_object(value);
            if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
          } else throw new Error(`Type "${constructor.toString()}" not yet supported`);
        }
      } else throw new Error(`Type "${typeof value}" not yet supported`);
      this._bufferBuilder.flush();
    }
    pack_bin(blob) {
      const length = blob.length;
      if (length <= 15) this.pack_uint8(160 + length);
      else if (length <= 65535) {
        this._bufferBuilder.append(218);
        this.pack_uint16(length);
      } else if (length <= 4294967295) {
        this._bufferBuilder.append(219);
        this.pack_uint32(length);
      } else throw new Error("Invalid length");
      this._bufferBuilder.append_buffer(blob);
    }
    pack_string(str) {
      const encoded = this._textEncoder.encode(str);
      const length = encoded.length;
      if (length <= 15) this.pack_uint8(176 + length);
      else if (length <= 65535) {
        this._bufferBuilder.append(216);
        this.pack_uint16(length);
      } else if (length <= 4294967295) {
        this._bufferBuilder.append(217);
        this.pack_uint32(length);
      } else throw new Error("Invalid length");
      this._bufferBuilder.append_buffer(encoded);
    }
    pack_array(ary) {
      const length = ary.length;
      if (length <= 15) this.pack_uint8(144 + length);
      else if (length <= 65535) {
        this._bufferBuilder.append(220);
        this.pack_uint16(length);
      } else if (length <= 4294967295) {
        this._bufferBuilder.append(221);
        this.pack_uint32(length);
      } else throw new Error("Invalid length");
      const packNext = (index) => {
        if (index < length) {
          const res = this.pack(ary[index]);
          if (res instanceof Promise) return res.then(() => packNext(index + 1));
          return packNext(index + 1);
        }
      };
      return packNext(0);
    }
    pack_integer(num) {
      if (num >= -32 && num <= 127) this._bufferBuilder.append(num & 255);
      else if (num >= 0 && num <= 255) {
        this._bufferBuilder.append(204);
        this.pack_uint8(num);
      } else if (num >= -128 && num <= 127) {
        this._bufferBuilder.append(208);
        this.pack_int8(num);
      } else if (num >= 0 && num <= 65535) {
        this._bufferBuilder.append(205);
        this.pack_uint16(num);
      } else if (num >= -32768 && num <= 32767) {
        this._bufferBuilder.append(209);
        this.pack_int16(num);
      } else if (num >= 0 && num <= 4294967295) {
        this._bufferBuilder.append(206);
        this.pack_uint32(num);
      } else if (num >= -2147483648 && num <= 2147483647) {
        this._bufferBuilder.append(210);
        this.pack_int32(num);
      } else if (num >= -9223372036854776e3 && num <= 9223372036854776e3) {
        this._bufferBuilder.append(211);
        this.pack_int64(num);
      } else if (num >= 0 && num <= 18446744073709552e3) {
        this._bufferBuilder.append(207);
        this.pack_uint64(num);
      } else throw new Error("Invalid integer");
    }
    pack_double(num) {
      let sign = 0;
      if (num < 0) {
        sign = 1;
        num = -num;
      }
      const exp = Math.floor(Math.log(num) / Math.LN2);
      const frac0 = num / 2 ** exp - 1;
      const frac1 = Math.floor(frac0 * 2 ** 52);
      const b32 = 2 ** 32;
      const h32 = sign << 31 | exp + 1023 << 20 | frac1 / b32 & 1048575;
      const l32 = frac1 % b32;
      this._bufferBuilder.append(203);
      this.pack_int32(h32);
      this.pack_int32(l32);
    }
    pack_object(obj) {
      const keys = Object.keys(obj);
      const length = keys.length;
      if (length <= 15) this.pack_uint8(128 + length);
      else if (length <= 65535) {
        this._bufferBuilder.append(222);
        this.pack_uint16(length);
      } else if (length <= 4294967295) {
        this._bufferBuilder.append(223);
        this.pack_uint32(length);
      } else throw new Error("Invalid length");
      const packNext = (index) => {
        if (index < keys.length) {
          const prop = keys[index];
          if (obj.hasOwnProperty(prop)) {
            this.pack(prop);
            const res = this.pack(obj[prop]);
            if (res instanceof Promise) return res.then(() => packNext(index + 1));
          }
          return packNext(index + 1);
        }
      };
      return packNext(0);
    }
    pack_uint8(num) {
      this._bufferBuilder.append(num);
    }
    pack_uint16(num) {
      this._bufferBuilder.append(num >> 8);
      this._bufferBuilder.append(num & 255);
    }
    pack_uint32(num) {
      const n = num & 4294967295;
      this._bufferBuilder.append((n & 4278190080) >>> 24);
      this._bufferBuilder.append((n & 16711680) >>> 16);
      this._bufferBuilder.append((n & 65280) >>> 8);
      this._bufferBuilder.append(n & 255);
    }
    pack_uint64(num) {
      const high = num / 2 ** 32;
      const low = num % 2 ** 32;
      this._bufferBuilder.append((high & 4278190080) >>> 24);
      this._bufferBuilder.append((high & 16711680) >>> 16);
      this._bufferBuilder.append((high & 65280) >>> 8);
      this._bufferBuilder.append(high & 255);
      this._bufferBuilder.append((low & 4278190080) >>> 24);
      this._bufferBuilder.append((low & 16711680) >>> 16);
      this._bufferBuilder.append((low & 65280) >>> 8);
      this._bufferBuilder.append(low & 255);
    }
    pack_int8(num) {
      this._bufferBuilder.append(num & 255);
    }
    pack_int16(num) {
      this._bufferBuilder.append((num & 65280) >> 8);
      this._bufferBuilder.append(num & 255);
    }
    pack_int32(num) {
      this._bufferBuilder.append(num >>> 24 & 255);
      this._bufferBuilder.append((num & 16711680) >>> 16);
      this._bufferBuilder.append((num & 65280) >>> 8);
      this._bufferBuilder.append(num & 255);
    }
    pack_int64(num) {
      const high = Math.floor(num / 2 ** 32);
      const low = num % 2 ** 32;
      this._bufferBuilder.append((high & 4278190080) >>> 24);
      this._bufferBuilder.append((high & 16711680) >>> 16);
      this._bufferBuilder.append((high & 65280) >>> 8);
      this._bufferBuilder.append(high & 255);
      this._bufferBuilder.append((low & 4278190080) >>> 24);
      this._bufferBuilder.append((low & 16711680) >>> 16);
      this._bufferBuilder.append((low & 65280) >>> 8);
      this._bufferBuilder.append(low & 255);
    }
    constructor() {
      this._bufferBuilder = new (0, $e8379818650e2442$export$93654d4f2d6cd524)();
      this._textEncoder = new TextEncoder();
    }
  };

  // node_modules/webrtc-adapter/src/js/utils.js
  var logDisabled_ = true;
  var deprecationWarnings_ = true;
  function extractVersion(uastring, expr, pos) {
    const match = uastring.match(expr);
    return match && match.length >= pos && parseFloat(match[pos], 10);
  }
  function wrapPeerConnectionEvent(window2, eventNameToWrap, wrapper) {
    if (!window2.RTCPeerConnection) {
      return;
    }
    const addEventListener = Object.getOwnPropertyDescriptor(
      EventTarget.prototype,
      "addEventListener"
    );
    if (!addEventListener.writable) {
      log("Unable to polyfill events");
      return;
    }
    const proto = window2.RTCPeerConnection.prototype;
    const nativeAddEventListener = proto.addEventListener;
    proto.addEventListener = function(nativeEventName, cb) {
      if (nativeEventName !== eventNameToWrap) {
        return nativeAddEventListener.apply(this, arguments);
      }
      const wrappedCallback = (e) => {
        const modifiedEvent = wrapper(e);
        if (modifiedEvent) {
          if (cb.handleEvent) {
            cb.handleEvent(modifiedEvent);
          } else {
            cb(modifiedEvent);
          }
        }
      };
      this._eventMap = this._eventMap || {};
      if (!this._eventMap[eventNameToWrap]) {
        this._eventMap[eventNameToWrap] = /* @__PURE__ */ new Map();
      }
      this._eventMap[eventNameToWrap].set(cb, wrappedCallback);
      return nativeAddEventListener.apply(this, [
        nativeEventName,
        wrappedCallback
      ]);
    };
    const nativeRemoveEventListener = proto.removeEventListener;
    proto.removeEventListener = function(nativeEventName, cb) {
      if (nativeEventName !== eventNameToWrap || !this._eventMap || !this._eventMap[eventNameToWrap]) {
        return nativeRemoveEventListener.apply(this, arguments);
      }
      if (!this._eventMap[eventNameToWrap].has(cb)) {
        return nativeRemoveEventListener.apply(this, arguments);
      }
      const unwrappedCb = this._eventMap[eventNameToWrap].get(cb);
      this._eventMap[eventNameToWrap].delete(cb);
      if (this._eventMap[eventNameToWrap].size === 0) {
        delete this._eventMap[eventNameToWrap];
      }
      if (Object.keys(this._eventMap).length === 0) {
        delete this._eventMap;
      }
      return nativeRemoveEventListener.apply(this, [
        nativeEventName,
        unwrappedCb
      ]);
    };
    Object.defineProperty(proto, "on" + eventNameToWrap, {
      get() {
        return this["_on" + eventNameToWrap];
      },
      set(cb) {
        if (this["_on" + eventNameToWrap]) {
          this.removeEventListener(
            eventNameToWrap,
            this["_on" + eventNameToWrap]
          );
          delete this["_on" + eventNameToWrap];
        }
        if (cb) {
          this.addEventListener(
            eventNameToWrap,
            this["_on" + eventNameToWrap] = cb
          );
        }
      },
      enumerable: true,
      configurable: true
    });
  }
  function disableLog(bool) {
    if (typeof bool !== "boolean") {
      return new Error("Argument type: " + typeof bool + ". Please use a boolean.");
    }
    logDisabled_ = bool;
    return bool ? "adapter.js logging disabled" : "adapter.js logging enabled";
  }
  function disableWarnings(bool) {
    if (typeof bool !== "boolean") {
      return new Error("Argument type: " + typeof bool + ". Please use a boolean.");
    }
    deprecationWarnings_ = !bool;
    return "adapter.js deprecation warnings " + (bool ? "disabled" : "enabled");
  }
  function log() {
    if (typeof window === "object") {
      if (logDisabled_) {
        return;
      }
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log.apply(console, arguments);
      }
    }
  }
  function deprecated(oldMethod, newMethod) {
    if (!deprecationWarnings_) {
      return;
    }
    console.warn(oldMethod + " is deprecated, please use " + newMethod + " instead.");
  }
  function detectBrowser(window2) {
    const result = { browser: null, version: null };
    if (typeof window2 === "undefined" || !window2.navigator || !window2.navigator.userAgent) {
      result.browser = "Not a browser.";
      return result;
    }
    const { navigator: navigator2 } = window2;
    if (navigator2.userAgentData && navigator2.userAgentData.brands) {
      const chromium = navigator2.userAgentData.brands.find((brand) => {
        return brand.brand === "Chromium";
      });
      if (chromium) {
        const version = parseInt(chromium.version, 10);
        if (version >= 90) {
          return { browser: "chrome", version };
        }
      }
    }
    if (navigator2.mozGetUserMedia) {
      result.browser = "firefox";
      result.version = parseInt(extractVersion(
        navigator2.userAgent,
        /Firefox\/(\d+)\./,
        1
      ));
    } else if (navigator2.webkitGetUserMedia || window2.isSecureContext === false && window2.webkitRTCPeerConnection) {
      result.browser = "chrome";
      result.version = parseInt(extractVersion(
        navigator2.userAgent,
        /Chrom(e|ium)\/(\d+)\./,
        2
      )) || null;
    } else if (window2.RTCPeerConnection && navigator2.userAgent.match(/AppleWebKit\/(\d+)\./)) {
      result.browser = "safari";
      result.version = parseInt(extractVersion(
        navigator2.userAgent,
        /AppleWebKit\/(\d+)\./,
        1
      ));
      result.supportsUnifiedPlan = window2.RTCRtpTransceiver && "currentDirection" in window2.RTCRtpTransceiver.prototype;
      result._safariVersion = extractVersion(
        navigator2.userAgent,
        /Version\/(\d+(\.?\d+))/,
        1
      );
    } else {
      result.browser = "Not a supported browser.";
      return result;
    }
    return result;
  }
  function isObject(val) {
    return Object.prototype.toString.call(val) === "[object Object]";
  }
  function compactObject(data) {
    if (!isObject(data)) {
      return data;
    }
    return Object.keys(data).reduce(function(accumulator, key) {
      const isObj = isObject(data[key]);
      const value = isObj ? compactObject(data[key]) : data[key];
      const isEmptyObject = isObj && !Object.keys(value).length;
      if (value === void 0 || isEmptyObject) {
        return accumulator;
      }
      return Object.assign(accumulator, { [key]: value });
    }, {});
  }
  function walkStats(stats, base, resultSet) {
    if (!base || resultSet.has(base.id)) {
      return;
    }
    resultSet.set(base.id, base);
    Object.keys(base).forEach((name) => {
      if (name.endsWith("Id")) {
        walkStats(stats, stats.get(base[name]), resultSet);
      } else if (name.endsWith("Ids")) {
        base[name].forEach((id) => {
          walkStats(stats, stats.get(id), resultSet);
        });
      }
    });
  }
  function filterStats(result, track, outbound) {
    const streamStatsType = outbound ? "outbound-rtp" : "inbound-rtp";
    const filteredResult = /* @__PURE__ */ new Map();
    if (track === null) {
      return filteredResult;
    }
    const trackStats = [];
    result.forEach((value) => {
      if (value.type === "track" && value.trackIdentifier === track.id) {
        trackStats.push(value);
      }
    });
    trackStats.forEach((trackStat) => {
      result.forEach((stats) => {
        if (stats.type === streamStatsType && stats.trackId === trackStat.id) {
          walkStats(result, stats, filteredResult);
        }
      });
    });
    return filteredResult;
  }

  // node_modules/webrtc-adapter/src/js/chrome/chrome_shim.js
  var chrome_shim_exports = {};
  __export(chrome_shim_exports, {
    fixNegotiationNeeded: () => fixNegotiationNeeded,
    shimAddTrackRemoveTrack: () => shimAddTrackRemoveTrack,
    shimAddTrackRemoveTrackWithNative: () => shimAddTrackRemoveTrackWithNative,
    shimGetSendersWithDtmf: () => shimGetSendersWithDtmf,
    shimGetUserMedia: () => shimGetUserMedia,
    shimMediaStream: () => shimMediaStream,
    shimOnTrack: () => shimOnTrack,
    shimPeerConnection: () => shimPeerConnection,
    shimSenderReceiverGetStats: () => shimSenderReceiverGetStats
  });

  // node_modules/webrtc-adapter/src/js/chrome/getusermedia.js
  var logging = log;
  function shimGetUserMedia(window2, browserDetails) {
    if (browserDetails.version >= 64) {
      return;
    }
    const navigator2 = window2 && window2.navigator;
    if (!navigator2.mediaDevices) {
      return;
    }
    const constraintsToChrome_ = function(c) {
      if (typeof c !== "object" || c.mandatory || c.optional) {
        return c;
      }
      const cc = {};
      Object.keys(c).forEach((key) => {
        if (key === "require" || key === "advanced" || key === "mediaSource") {
          return;
        }
        const r = typeof c[key] === "object" ? c[key] : { ideal: c[key] };
        if (r.exact !== void 0 && typeof r.exact === "number") {
          r.min = r.max = r.exact;
        }
        const oldname_ = function(prefix, name) {
          if (prefix) {
            return prefix + name.charAt(0).toUpperCase() + name.slice(1);
          }
          return name === "deviceId" ? "sourceId" : name;
        };
        if (r.ideal !== void 0) {
          cc.optional = cc.optional || [];
          let oc = {};
          if (typeof r.ideal === "number") {
            oc[oldname_("min", key)] = r.ideal;
            cc.optional.push(oc);
            oc = {};
            oc[oldname_("max", key)] = r.ideal;
            cc.optional.push(oc);
          } else {
            oc[oldname_("", key)] = r.ideal;
            cc.optional.push(oc);
          }
        }
        if (r.exact !== void 0 && typeof r.exact !== "number") {
          cc.mandatory = cc.mandatory || {};
          cc.mandatory[oldname_("", key)] = r.exact;
        } else {
          ["min", "max"].forEach((mix) => {
            if (r[mix] !== void 0) {
              cc.mandatory = cc.mandatory || {};
              cc.mandatory[oldname_(mix, key)] = r[mix];
            }
          });
        }
      });
      if (c.advanced) {
        cc.optional = (cc.optional || []).concat(c.advanced);
      }
      return cc;
    };
    const shimConstraints_ = function(constraints, func) {
      if (browserDetails.version >= 61) {
        return func(constraints);
      }
      constraints = JSON.parse(JSON.stringify(constraints));
      if (constraints && typeof constraints.audio === "object") {
        const remap = function(obj, a, b) {
          if (a in obj && !(b in obj)) {
            obj[b] = obj[a];
            delete obj[a];
          }
        };
        constraints = JSON.parse(JSON.stringify(constraints));
        remap(constraints.audio, "autoGainControl", "googAutoGainControl");
        remap(constraints.audio, "noiseSuppression", "googNoiseSuppression");
        constraints.audio = constraintsToChrome_(constraints.audio);
      }
      if (constraints && typeof constraints.video === "object") {
        let face = constraints.video.facingMode;
        face = face && (typeof face === "object" ? face : { ideal: face });
        const getSupportedFacingModeLies = browserDetails.version < 66;
        if (face && (face.exact === "user" || face.exact === "environment" || face.ideal === "user" || face.ideal === "environment") && !(navigator2.mediaDevices.getSupportedConstraints && navigator2.mediaDevices.getSupportedConstraints().facingMode && !getSupportedFacingModeLies)) {
          delete constraints.video.facingMode;
          let matches;
          if (face.exact === "environment" || face.ideal === "environment") {
            matches = ["back", "rear"];
          } else if (face.exact === "user" || face.ideal === "user") {
            matches = ["front"];
          }
          if (matches) {
            return navigator2.mediaDevices.enumerateDevices().then((devices) => {
              devices = devices.filter((d) => d.kind === "videoinput");
              let dev = devices.find((d) => matches.some((match) => d.label.toLowerCase().includes(match)));
              if (!dev && devices.length && matches.includes("back")) {
                dev = devices[devices.length - 1];
              }
              if (dev) {
                constraints.video.deviceId = face.exact ? { exact: dev.deviceId } : { ideal: dev.deviceId };
              }
              constraints.video = constraintsToChrome_(constraints.video);
              logging("chrome: " + JSON.stringify(constraints));
              return func(constraints);
            });
          }
        }
        constraints.video = constraintsToChrome_(constraints.video);
      }
      logging("chrome: " + JSON.stringify(constraints));
      return func(constraints);
    };
    const shimError_ = function(e) {
      if (browserDetails.version >= 64) {
        return e;
      }
      return {
        name: {
          PermissionDeniedError: "NotAllowedError",
          PermissionDismissedError: "NotAllowedError",
          InvalidStateError: "NotAllowedError",
          DevicesNotFoundError: "NotFoundError",
          ConstraintNotSatisfiedError: "OverconstrainedError",
          TrackStartError: "NotReadableError",
          MediaDeviceFailedDueToShutdown: "NotAllowedError",
          MediaDeviceKillSwitchOn: "NotAllowedError",
          TabCaptureError: "AbortError",
          ScreenCaptureError: "AbortError",
          DeviceCaptureError: "AbortError"
        }[e.name] || e.name,
        message: e.message,
        constraint: e.constraint || e.constraintName,
        toString() {
          return this.name + (this.message && ": ") + this.message;
        }
      };
    };
    const getUserMedia_ = function(constraints, onSuccess, onError) {
      shimConstraints_(constraints, (c) => {
        navigator2.webkitGetUserMedia(c, onSuccess, (e) => {
          if (onError) {
            onError(shimError_(e));
          }
        });
      });
    };
    navigator2.getUserMedia = getUserMedia_.bind(navigator2);
    if (navigator2.mediaDevices.getUserMedia) {
      const origGetUserMedia = navigator2.mediaDevices.getUserMedia.bind(navigator2.mediaDevices);
      navigator2.mediaDevices.getUserMedia = function(cs) {
        return shimConstraints_(cs, (c) => origGetUserMedia(c).then((stream) => {
          if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
            stream.getTracks().forEach((track) => {
              track.stop();
            });
            throw new DOMException("", "NotFoundError");
          }
          return stream;
        }, (e) => Promise.reject(shimError_(e))));
      };
    }
  }

  // node_modules/webrtc-adapter/src/js/chrome/chrome_shim.js
  function shimMediaStream(window2) {
    window2.MediaStream = window2.MediaStream || window2.webkitMediaStream;
  }
  function shimOnTrack(window2, browserDetails) {
    if (browserDetails.version > 102) {
      return;
    }
    if (typeof window2 === "object" && window2.RTCPeerConnection && !("ontrack" in window2.RTCPeerConnection.prototype)) {
      Object.defineProperty(window2.RTCPeerConnection.prototype, "ontrack", {
        get() {
          return this._ontrack;
        },
        set(f) {
          if (this._ontrack) {
            this.removeEventListener("track", this._ontrack);
          }
          this.addEventListener("track", this._ontrack = f);
        },
        enumerable: true,
        configurable: true
      });
      const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
      window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
        if (!this._ontrackpoly) {
          this._ontrackpoly = (e) => {
            e.stream.addEventListener("addtrack", (te) => {
              let receiver;
              if (window2.RTCPeerConnection.prototype.getReceivers) {
                receiver = this.getReceivers().find((r) => r.track && r.track.id === te.track.id);
              } else {
                receiver = { track: te.track };
              }
              const event = new Event("track");
              event.track = te.track;
              event.receiver = receiver;
              event.transceiver = { receiver };
              event.streams = [e.stream];
              this.dispatchEvent(event);
            });
            e.stream.getTracks().forEach((track) => {
              let receiver;
              if (window2.RTCPeerConnection.prototype.getReceivers) {
                receiver = this.getReceivers().find((r) => r.track && r.track.id === track.id);
              } else {
                receiver = { track };
              }
              const event = new Event("track");
              event.track = track;
              event.receiver = receiver;
              event.transceiver = { receiver };
              event.streams = [e.stream];
              this.dispatchEvent(event);
            });
          };
          this.addEventListener("addstream", this._ontrackpoly);
        }
        return origSetRemoteDescription.apply(this, arguments);
      };
    } else {
      wrapPeerConnectionEvent(window2, "track", (e) => {
        if (!e.transceiver) {
          Object.defineProperty(
            e,
            "transceiver",
            { value: { receiver: e.receiver } }
          );
        }
        return e;
      });
    }
  }
  function shimGetSendersWithDtmf(window2) {
    if (typeof window2 === "object" && window2.RTCPeerConnection && !("getSenders" in window2.RTCPeerConnection.prototype) && "createDTMFSender" in window2.RTCPeerConnection.prototype) {
      const shimSenderWithDtmf = function(pc, track) {
        return {
          track,
          get dtmf() {
            if (this._dtmf === void 0) {
              if (track.kind === "audio") {
                this._dtmf = pc.createDTMFSender(track);
              } else {
                this._dtmf = null;
              }
            }
            return this._dtmf;
          },
          _pc: pc
        };
      };
      if (!window2.RTCPeerConnection.prototype.getSenders) {
        window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
          this._senders = this._senders || [];
          return this._senders.slice();
        };
        const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
        window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
          let sender = origAddTrack.apply(this, arguments);
          if (!sender) {
            sender = shimSenderWithDtmf(this, track);
            this._senders.push(sender);
          }
          return sender;
        };
        const origRemoveTrack = window2.RTCPeerConnection.prototype.removeTrack;
        window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
          origRemoveTrack.apply(this, arguments);
          const idx = this._senders.indexOf(sender);
          if (idx !== -1) {
            this._senders.splice(idx, 1);
          }
        };
      }
      const origAddStream = window2.RTCPeerConnection.prototype.addStream;
      window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
        this._senders = this._senders || [];
        origAddStream.apply(this, [stream]);
        stream.getTracks().forEach((track) => {
          this._senders.push(shimSenderWithDtmf(this, track));
        });
      };
      const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
      window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
        this._senders = this._senders || [];
        origRemoveStream.apply(this, [stream]);
        stream.getTracks().forEach((track) => {
          const sender = this._senders.find((s) => s.track === track);
          if (sender) {
            this._senders.splice(this._senders.indexOf(sender), 1);
          }
        });
      };
    } else if (typeof window2 === "object" && window2.RTCPeerConnection && "getSenders" in window2.RTCPeerConnection.prototype && "createDTMFSender" in window2.RTCPeerConnection.prototype && window2.RTCRtpSender && !("dtmf" in window2.RTCRtpSender.prototype)) {
      const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
      window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
        const senders = origGetSenders.apply(this, []);
        senders.forEach((sender) => sender._pc = this);
        return senders;
      };
      Object.defineProperty(window2.RTCRtpSender.prototype, "dtmf", {
        get() {
          if (this._dtmf === void 0) {
            if (this.track.kind === "audio") {
              this._dtmf = this._pc.createDTMFSender(this.track);
            } else {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        }
      });
    }
  }
  function shimSenderReceiverGetStats(window2, browserDetails) {
    if (browserDetails.version >= 67) {
      return;
    }
    if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender && window2.RTCRtpReceiver)) {
      return;
    }
    if (!("getStats" in window2.RTCRtpSender.prototype)) {
      const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
      if (origGetSenders) {
        window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
          const senders = origGetSenders.apply(this, []);
          senders.forEach((sender) => sender._pc = this);
          return senders;
        };
      }
      const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
      if (origAddTrack) {
        window2.RTCPeerConnection.prototype.addTrack = function addTrack() {
          const sender = origAddTrack.apply(this, arguments);
          sender._pc = this;
          return sender;
        };
      }
      window2.RTCRtpSender.prototype.getStats = function getStats() {
        const sender = this;
        return this._pc.getStats().then((result) => (
          /* Note: this will include stats of all senders that
           *   send a track with the same id as sender.track as
           *   it is not possible to identify the RTCRtpSender.
           */
          filterStats(result, sender.track, true)
        ));
      };
    }
    if (!("getStats" in window2.RTCRtpReceiver.prototype)) {
      const origGetReceivers = window2.RTCPeerConnection.prototype.getReceivers;
      if (origGetReceivers) {
        window2.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
          const receivers = origGetReceivers.apply(this, []);
          receivers.forEach((receiver) => receiver._pc = this);
          return receivers;
        };
      }
      wrapPeerConnectionEvent(window2, "track", (e) => {
        e.receiver._pc = e.srcElement;
        return e;
      });
      window2.RTCRtpReceiver.prototype.getStats = function getStats() {
        const receiver = this;
        return this._pc.getStats().then((result) => filterStats(result, receiver.track, false));
      };
    }
    if (!("getStats" in window2.RTCRtpSender.prototype && "getStats" in window2.RTCRtpReceiver.prototype)) {
      return;
    }
    const origGetStats = window2.RTCPeerConnection.prototype.getStats;
    window2.RTCPeerConnection.prototype.getStats = function getStats() {
      if (arguments.length > 0 && arguments[0] instanceof window2.MediaStreamTrack) {
        const track = arguments[0];
        let sender;
        let receiver;
        let err;
        this.getSenders().forEach((s) => {
          if (s.track === track) {
            if (sender) {
              err = true;
            } else {
              sender = s;
            }
          }
        });
        this.getReceivers().forEach((r) => {
          if (r.track === track) {
            if (receiver) {
              err = true;
            } else {
              receiver = r;
            }
          }
          return r.track === track;
        });
        if (err || sender && receiver) {
          return Promise.reject(new DOMException(
            "There are more than one sender or receiver for the track.",
            "InvalidAccessError"
          ));
        } else if (sender) {
          return sender.getStats();
        } else if (receiver) {
          return receiver.getStats();
        }
        return Promise.reject(new DOMException(
          "There is no sender or receiver for the track.",
          "InvalidAccessError"
        ));
      }
      return origGetStats.apply(this, arguments);
    };
  }
  function shimAddTrackRemoveTrackWithNative(window2) {
    window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      return Object.keys(this._shimmedLocalStreams).map((streamId) => this._shimmedLocalStreams[streamId][0]);
    };
    const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
    window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
      if (!stream) {
        return origAddTrack.apply(this, arguments);
      }
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      const sender = origAddTrack.apply(this, arguments);
      if (!this._shimmedLocalStreams[stream.id]) {
        this._shimmedLocalStreams[stream.id] = [stream, sender];
      } else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) {
        this._shimmedLocalStreams[stream.id].push(sender);
      }
      return sender;
    };
    const origAddStream = window2.RTCPeerConnection.prototype.addStream;
    window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      stream.getTracks().forEach((track) => {
        const alreadyExists = this.getSenders().find((s) => s.track === track);
        if (alreadyExists) {
          throw new DOMException(
            "Track already exists.",
            "InvalidAccessError"
          );
        }
      });
      const existingSenders = this.getSenders();
      origAddStream.apply(this, arguments);
      const newSenders = this.getSenders().filter((newSender) => existingSenders.indexOf(newSender) === -1);
      this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
    };
    const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
    window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      delete this._shimmedLocalStreams[stream.id];
      return origRemoveStream.apply(this, arguments);
    };
    const origRemoveTrack = window2.RTCPeerConnection.prototype.removeTrack;
    window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      if (sender) {
        Object.keys(this._shimmedLocalStreams).forEach((streamId) => {
          const idx = this._shimmedLocalStreams[streamId].indexOf(sender);
          if (idx !== -1) {
            this._shimmedLocalStreams[streamId].splice(idx, 1);
          }
          if (this._shimmedLocalStreams[streamId].length === 1) {
            delete this._shimmedLocalStreams[streamId];
          }
        });
      }
      return origRemoveTrack.apply(this, arguments);
    };
  }
  function shimAddTrackRemoveTrack(window2, browserDetails) {
    if (!window2.RTCPeerConnection) {
      return;
    }
    if (window2.RTCPeerConnection.prototype.addTrack && browserDetails.version >= 65) {
      return shimAddTrackRemoveTrackWithNative(window2);
    }
    const origGetLocalStreams = window2.RTCPeerConnection.prototype.getLocalStreams;
    window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
      const nativeStreams = origGetLocalStreams.apply(this);
      this._reverseStreams = this._reverseStreams || {};
      return nativeStreams.map((stream) => this._reverseStreams[stream.id]);
    };
    const origAddStream = window2.RTCPeerConnection.prototype.addStream;
    window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      this._streams = this._streams || {};
      this._reverseStreams = this._reverseStreams || {};
      stream.getTracks().forEach((track) => {
        const alreadyExists = this.getSenders().find((s) => s.track === track);
        if (alreadyExists) {
          throw new DOMException(
            "Track already exists.",
            "InvalidAccessError"
          );
        }
      });
      if (!this._reverseStreams[stream.id]) {
        const newStream = new window2.MediaStream(stream.getTracks());
        this._streams[stream.id] = newStream;
        this._reverseStreams[newStream.id] = stream;
        stream = newStream;
      }
      origAddStream.apply(this, [stream]);
    };
    const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
    window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      this._streams = this._streams || {};
      this._reverseStreams = this._reverseStreams || {};
      origRemoveStream.apply(this, [this._streams[stream.id] || stream]);
      delete this._reverseStreams[this._streams[stream.id] ? this._streams[stream.id].id : stream.id];
      delete this._streams[stream.id];
    };
    window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
      if (this.signalingState === "closed") {
        throw new DOMException(
          "The RTCPeerConnection's signalingState is 'closed'.",
          "InvalidStateError"
        );
      }
      const streams = [].slice.call(arguments, 1);
      if (streams.length !== 1 || !streams[0].getTracks().find((t) => t === track)) {
        throw new DOMException(
          "The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.",
          "NotSupportedError"
        );
      }
      const alreadyExists = this.getSenders().find((s) => s.track === track);
      if (alreadyExists) {
        throw new DOMException(
          "Track already exists.",
          "InvalidAccessError"
        );
      }
      this._streams = this._streams || {};
      this._reverseStreams = this._reverseStreams || {};
      const oldStream = this._streams[stream.id];
      if (oldStream) {
        oldStream.addTrack(track);
        Promise.resolve().then(() => {
          this.dispatchEvent(new Event("negotiationneeded"));
        });
      } else {
        const newStream = new window2.MediaStream([track]);
        this._streams[stream.id] = newStream;
        this._reverseStreams[newStream.id] = stream;
        this.addStream(newStream);
      }
      return this.getSenders().find((s) => s.track === track);
    };
    function replaceInternalStreamId(pc, description) {
      let sdp2 = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach((internalId) => {
        const externalStream = pc._reverseStreams[internalId];
        const internalStream = pc._streams[externalStream.id];
        sdp2 = sdp2.replace(
          new RegExp(internalStream.id, "g"),
          externalStream.id
        );
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp2
      });
    }
    function replaceExternalStreamId(pc, description) {
      let sdp2 = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach((internalId) => {
        const externalStream = pc._reverseStreams[internalId];
        const internalStream = pc._streams[externalStream.id];
        sdp2 = sdp2.replace(
          new RegExp(externalStream.id, "g"),
          internalStream.id
        );
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp2
      });
    }
    ["createOffer", "createAnswer"].forEach(function(method) {
      const nativeMethod = window2.RTCPeerConnection.prototype[method];
      const methodObj = { [method]() {
        const args = arguments;
        const isLegacyCall = arguments.length && typeof arguments[0] === "function";
        if (isLegacyCall) {
          return nativeMethod.apply(this, [
            (description) => {
              const desc = replaceInternalStreamId(this, description);
              args[0].apply(null, [desc]);
            },
            (err) => {
              if (args[1]) {
                args[1].apply(null, err);
              }
            },
            arguments[2]
          ]);
        }
        return nativeMethod.apply(this, arguments).then((description) => replaceInternalStreamId(this, description));
      } };
      window2.RTCPeerConnection.prototype[method] = methodObj[method];
    });
    const origSetLocalDescription = window2.RTCPeerConnection.prototype.setLocalDescription;
    window2.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
      if (!arguments.length || !arguments[0].type) {
        return origSetLocalDescription.apply(this, arguments);
      }
      arguments[0] = replaceExternalStreamId(this, arguments[0]);
      return origSetLocalDescription.apply(this, arguments);
    };
    const origLocalDescription = Object.getOwnPropertyDescriptor(
      window2.RTCPeerConnection.prototype,
      "localDescription"
    );
    Object.defineProperty(
      window2.RTCPeerConnection.prototype,
      "localDescription",
      {
        get() {
          const description = origLocalDescription.get.apply(this);
          if (description.type === "") {
            return description;
          }
          return replaceInternalStreamId(this, description);
        }
      }
    );
    window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
      if (this.signalingState === "closed") {
        throw new DOMException(
          "The RTCPeerConnection's signalingState is 'closed'.",
          "InvalidStateError"
        );
      }
      if (!sender._pc) {
        throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.", "TypeError");
      }
      const isLocal = sender._pc === this;
      if (!isLocal) {
        throw new DOMException(
          "Sender was not created by this connection.",
          "InvalidAccessError"
        );
      }
      this._streams = this._streams || {};
      let stream;
      Object.keys(this._streams).forEach((streamid) => {
        const hasTrack = this._streams[streamid].getTracks().find((track) => sender.track === track);
        if (hasTrack) {
          stream = this._streams[streamid];
        }
      });
      if (stream) {
        if (stream.getTracks().length === 1) {
          this.removeStream(this._reverseStreams[stream.id]);
        } else {
          stream.removeTrack(sender.track);
        }
        this.dispatchEvent(new Event("negotiationneeded"));
      }
    };
  }
  function shimPeerConnection(window2, browserDetails) {
    if (!window2.RTCPeerConnection && window2.webkitRTCPeerConnection) {
      window2.RTCPeerConnection = window2.webkitRTCPeerConnection;
    }
    if (!window2.RTCPeerConnection) {
      return;
    }
    if (browserDetails.version < 53) {
      ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
        const nativeMethod = window2.RTCPeerConnection.prototype[method];
        const methodObj = { [method]() {
          arguments[0] = new (method === "addIceCandidate" ? window2.RTCIceCandidate : window2.RTCSessionDescription)(arguments[0]);
          return nativeMethod.apply(this, arguments);
        } };
        window2.RTCPeerConnection.prototype[method] = methodObj[method];
      });
    }
  }
  function fixNegotiationNeeded(window2, browserDetails) {
    if (browserDetails.version > 102) {
      return;
    }
    wrapPeerConnectionEvent(window2, "negotiationneeded", (e) => {
      const pc = e.target;
      if (browserDetails.version < 72 || pc.getConfiguration && pc.getConfiguration().sdpSemantics === "plan-b") {
        if (pc.signalingState !== "stable") {
          return;
        }
      }
      return e;
    });
  }

  // node_modules/webrtc-adapter/src/js/firefox/firefox_shim.js
  var firefox_shim_exports = {};
  __export(firefox_shim_exports, {
    shimAddTransceiver: () => shimAddTransceiver,
    shimCreateAnswer: () => shimCreateAnswer,
    shimCreateOffer: () => shimCreateOffer,
    shimGetDisplayMedia: () => shimGetDisplayMedia,
    shimGetParameters: () => shimGetParameters,
    shimGetStats: () => shimGetStats,
    shimGetUserMedia: () => shimGetUserMedia2,
    shimOnTrack: () => shimOnTrack2,
    shimPeerConnection: () => shimPeerConnection2,
    shimRTCDataChannel: () => shimRTCDataChannel,
    shimReceiverGetStats: () => shimReceiverGetStats,
    shimRemoveStream: () => shimRemoveStream,
    shimSenderGetStats: () => shimSenderGetStats
  });

  // node_modules/webrtc-adapter/src/js/firefox/getusermedia.js
  function shimGetUserMedia2(window2, browserDetails) {
    const navigator2 = window2 && window2.navigator;
    if (!navigator2.mediaDevices) {
      return;
    }
    const MediaStreamTrack = window2 && window2.MediaStreamTrack;
    navigator2.getUserMedia = function(constraints, onSuccess, onError) {
      deprecated(
        "navigator.getUserMedia",
        "navigator.mediaDevices.getUserMedia"
      );
      navigator2.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
    };
    if (!(browserDetails.version > 55 && "autoGainControl" in navigator2.mediaDevices.getSupportedConstraints())) {
      const remap = function(obj, a, b) {
        if (a in obj && !(b in obj)) {
          obj[b] = obj[a];
          delete obj[a];
        }
      };
      const nativeGetUserMedia = navigator2.mediaDevices.getUserMedia.bind(navigator2.mediaDevices);
      navigator2.mediaDevices.getUserMedia = function(c) {
        if (typeof c === "object" && typeof c.audio === "object") {
          c = JSON.parse(JSON.stringify(c));
          remap(c.audio, "autoGainControl", "mozAutoGainControl");
          remap(c.audio, "noiseSuppression", "mozNoiseSuppression");
        }
        return nativeGetUserMedia(c);
      };
      if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
        const nativeGetSettings = MediaStreamTrack.prototype.getSettings;
        MediaStreamTrack.prototype.getSettings = function() {
          const obj = nativeGetSettings.apply(this, arguments);
          remap(obj, "mozAutoGainControl", "autoGainControl");
          remap(obj, "mozNoiseSuppression", "noiseSuppression");
          return obj;
        };
      }
      if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
        const nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
        MediaStreamTrack.prototype.applyConstraints = function(c) {
          if (this.kind === "audio" && typeof c === "object") {
            c = JSON.parse(JSON.stringify(c));
            remap(c, "autoGainControl", "mozAutoGainControl");
            remap(c, "noiseSuppression", "mozNoiseSuppression");
          }
          return nativeApplyConstraints.apply(this, [c]);
        };
      }
    }
  }

  // node_modules/webrtc-adapter/src/js/firefox/getdisplaymedia.js
  function shimGetDisplayMedia(window2, preferredMediaSource) {
    if (!window2.navigator.mediaDevices) {
      return;
    }
    if (window2.navigator.mediaDevices && "getDisplayMedia" in window2.navigator.mediaDevices) {
      return;
    }
    window2.navigator.mediaDevices.getDisplayMedia = function getDisplayMedia(constraints) {
      if (!(constraints && constraints.video)) {
        const err = new DOMException("getDisplayMedia without video constraints is undefined");
        err.name = "NotFoundError";
        err.code = 8;
        return Promise.reject(err);
      }
      if (constraints.video === true) {
        constraints.video = { mediaSource: preferredMediaSource };
      } else {
        constraints.video.mediaSource = preferredMediaSource;
      }
      return window2.navigator.mediaDevices.getUserMedia(constraints);
    };
  }

  // node_modules/webrtc-adapter/src/js/firefox/firefox_shim.js
  function shimOnTrack2(window2) {
    if (typeof window2 === "object" && window2.RTCTrackEvent && "receiver" in window2.RTCTrackEvent.prototype && !("transceiver" in window2.RTCTrackEvent.prototype)) {
      Object.defineProperty(window2.RTCTrackEvent.prototype, "transceiver", {
        get() {
          return { receiver: this.receiver };
        }
      });
    }
  }
  function shimPeerConnection2(window2, browserDetails) {
    if (typeof window2 !== "object" || !(window2.RTCPeerConnection || window2.mozRTCPeerConnection)) {
      return;
    }
    if (!window2.RTCPeerConnection && window2.mozRTCPeerConnection) {
      window2.RTCPeerConnection = window2.mozRTCPeerConnection;
    }
    if (browserDetails.version < 53) {
      ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
        const nativeMethod = window2.RTCPeerConnection.prototype[method];
        const methodObj = { [method]() {
          arguments[0] = new (method === "addIceCandidate" ? window2.RTCIceCandidate : window2.RTCSessionDescription)(arguments[0]);
          return nativeMethod.apply(this, arguments);
        } };
        window2.RTCPeerConnection.prototype[method] = methodObj[method];
      });
    }
  }
  function shimGetStats(window2, browserDetails) {
    if (typeof window2 !== "object" || !(window2.RTCPeerConnection || window2.mozRTCPeerConnection)) {
      return;
    }
    if (browserDetails.version >= 151) {
      return;
    }
    const modernStatsTypes = {
      inboundrtp: "inbound-rtp",
      outboundrtp: "outbound-rtp",
      candidatepair: "candidate-pair",
      localcandidate: "local-candidate",
      remotecandidate: "remote-candidate"
    };
    const nativeGetStats = window2.RTCPeerConnection.prototype.getStats;
    window2.RTCPeerConnection.prototype.getStats = function getStats() {
      const [selector, onSucc, onErr] = arguments;
      if (this.signalingState === "closed") {
        return Promise.resolve(/* @__PURE__ */ new Map());
      }
      return nativeGetStats.apply(this, [selector || null]).then((stats) => {
        if (browserDetails.version < 53 && !onSucc) {
          try {
            stats.forEach((stat) => {
              stat.type = modernStatsTypes[stat.type] || stat.type;
            });
          } catch (e) {
            if (e.name !== "TypeError") {
              throw e;
            }
            stats.forEach((stat, i) => {
              stats.set(i, Object.assign({}, stat, {
                type: modernStatsTypes[stat.type] || stat.type
              }));
            });
          }
        }
        return stats;
      }).then(onSucc, onErr);
    };
  }
  function shimSenderGetStats(window2) {
    if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender)) {
      return;
    }
    if (window2.RTCRtpSender && "getStats" in window2.RTCRtpSender.prototype) {
      return;
    }
    const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
    if (origGetSenders) {
      window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
        const senders = origGetSenders.apply(this, []);
        senders.forEach((sender) => sender._pc = this);
        return senders;
      };
    }
    const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
    if (origAddTrack) {
      window2.RTCPeerConnection.prototype.addTrack = function addTrack() {
        const sender = origAddTrack.apply(this, arguments);
        sender._pc = this;
        return sender;
      };
    }
    window2.RTCRtpSender.prototype.getStats = function getStats() {
      return this.track ? this._pc.getStats(this.track) : Promise.resolve(/* @__PURE__ */ new Map());
    };
  }
  function shimReceiverGetStats(window2) {
    if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender)) {
      return;
    }
    if (window2.RTCRtpSender && "getStats" in window2.RTCRtpReceiver.prototype) {
      return;
    }
    const origGetReceivers = window2.RTCPeerConnection.prototype.getReceivers;
    if (origGetReceivers) {
      window2.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
        const receivers = origGetReceivers.apply(this, []);
        receivers.forEach((receiver) => receiver._pc = this);
        return receivers;
      };
    }
    wrapPeerConnectionEvent(window2, "track", (e) => {
      e.receiver._pc = e.srcElement;
      return e;
    });
    window2.RTCRtpReceiver.prototype.getStats = function getStats() {
      return this._pc.getStats(this.track);
    };
  }
  function shimRemoveStream(window2) {
    if (!window2.RTCPeerConnection || "removeStream" in window2.RTCPeerConnection.prototype) {
      return;
    }
    window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      deprecated("removeStream", "removeTrack");
      this.getSenders().forEach((sender) => {
        if (sender.track && stream.getTracks().includes(sender.track)) {
          this.removeTrack(sender);
        }
      });
    };
  }
  function shimRTCDataChannel(window2) {
    if (window2.DataChannel && !window2.RTCDataChannel) {
      window2.RTCDataChannel = window2.DataChannel;
    }
  }
  function shimAddTransceiver(window2, browserDetails) {
    if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
      return;
    }
    if (browserDetails.version >= 110) {
      return;
    }
    const origAddTransceiver = window2.RTCPeerConnection.prototype.addTransceiver;
    if (origAddTransceiver) {
      window2.RTCPeerConnection.prototype.addTransceiver = function addTransceiver() {
        this.setParametersPromises = [];
        let sendEncodings = arguments[1] && arguments[1].sendEncodings;
        if (sendEncodings === void 0) {
          sendEncodings = [];
        }
        sendEncodings = [...sendEncodings];
        const shouldPerformCheck = sendEncodings.length > 0;
        if (shouldPerformCheck) {
          sendEncodings.forEach((encodingParam) => {
            if ("rid" in encodingParam) {
              const ridRegex = /^[a-z0-9]{0,16}$/i;
              if (!ridRegex.test(encodingParam.rid)) {
                throw new TypeError("Invalid RID value provided.");
              }
            }
            if ("scaleResolutionDownBy" in encodingParam) {
              if (!(parseFloat(encodingParam.scaleResolutionDownBy) >= 1)) {
                throw new RangeError("scale_resolution_down_by must be >= 1.0");
              }
            }
            if ("maxFramerate" in encodingParam) {
              if (!(parseFloat(encodingParam.maxFramerate) >= 0)) {
                throw new RangeError("max_framerate must be >= 0.0");
              }
            }
          });
        }
        const transceiver = origAddTransceiver.apply(this, arguments);
        if (shouldPerformCheck) {
          const { sender } = transceiver;
          const params = sender.getParameters();
          if (!("encodings" in params) || // Avoid being fooled by patched getParameters() below.
          params.encodings.length === 1 && Object.keys(params.encodings[0]).length === 0) {
            params.encodings = sendEncodings;
            sender.sendEncodings = sendEncodings;
            this.setParametersPromises.push(
              sender.setParameters(params).then(() => {
                delete sender.sendEncodings;
              }).catch(() => {
                delete sender.sendEncodings;
              })
            );
          }
        }
        return transceiver;
      };
    }
  }
  function shimGetParameters(window2, browserDetails) {
    if (!(typeof window2 === "object" && window2.RTCRtpSender)) {
      return;
    }
    if (browserDetails.version >= 110) {
      return;
    }
    const origGetParameters = window2.RTCRtpSender.prototype.getParameters;
    if (origGetParameters) {
      window2.RTCRtpSender.prototype.getParameters = function getParameters() {
        const params = origGetParameters.apply(this, arguments);
        if (!("encodings" in params)) {
          params.encodings = [].concat(this.sendEncodings || [{}]);
        }
        return params;
      };
    }
  }
  function shimCreateOffer(window2, browserDetails) {
    if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
      return;
    }
    if (browserDetails.version >= 110) {
      return;
    }
    const origCreateOffer = window2.RTCPeerConnection.prototype.createOffer;
    window2.RTCPeerConnection.prototype.createOffer = function createOffer() {
      if (this.setParametersPromises && this.setParametersPromises.length) {
        return Promise.all(this.setParametersPromises).then(() => {
          return origCreateOffer.apply(this, arguments);
        }).finally(() => {
          this.setParametersPromises = [];
        });
      }
      return origCreateOffer.apply(this, arguments);
    };
  }
  function shimCreateAnswer(window2, browserDetails) {
    if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
      return;
    }
    if (browserDetails.version >= 110) {
      return;
    }
    const origCreateAnswer = window2.RTCPeerConnection.prototype.createAnswer;
    window2.RTCPeerConnection.prototype.createAnswer = function createAnswer() {
      if (this.setParametersPromises && this.setParametersPromises.length) {
        return Promise.all(this.setParametersPromises).then(() => {
          return origCreateAnswer.apply(this, arguments);
        }).finally(() => {
          this.setParametersPromises = [];
        });
      }
      return origCreateAnswer.apply(this, arguments);
    };
  }

  // node_modules/webrtc-adapter/src/js/safari/safari_shim.js
  var safari_shim_exports = {};
  __export(safari_shim_exports, {
    shimAudioContext: () => shimAudioContext,
    shimCallbacksAPI: () => shimCallbacksAPI,
    shimConstraints: () => shimConstraints,
    shimCreateOfferLegacy: () => shimCreateOfferLegacy,
    shimGetUserMedia: () => shimGetUserMedia3,
    shimLocalStreamsAPI: () => shimLocalStreamsAPI,
    shimRTCIceServerUrls: () => shimRTCIceServerUrls,
    shimRemoteStreamsAPI: () => shimRemoteStreamsAPI,
    shimTrackEventTransceiver: () => shimTrackEventTransceiver
  });
  function shimLocalStreamsAPI(window2) {
    if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
      return;
    }
    if (!("getLocalStreams" in window2.RTCPeerConnection.prototype)) {
      window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        return this._localStreams;
      };
    }
    if (!("addStream" in window2.RTCPeerConnection.prototype)) {
      const _addTrack = window2.RTCPeerConnection.prototype.addTrack;
      window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        if (!this._localStreams.includes(stream)) {
          this._localStreams.push(stream);
        }
        stream.getAudioTracks().forEach((track) => _addTrack.call(
          this,
          track,
          stream
        ));
        stream.getVideoTracks().forEach((track) => _addTrack.call(
          this,
          track,
          stream
        ));
      };
      window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, ...streams) {
        if (streams) {
          streams.forEach((stream) => {
            if (!this._localStreams) {
              this._localStreams = [stream];
            } else if (!this._localStreams.includes(stream)) {
              this._localStreams.push(stream);
            }
          });
        }
        return _addTrack.apply(this, arguments);
      };
    }
    if (!("removeStream" in window2.RTCPeerConnection.prototype)) {
      window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        const index = this._localStreams.indexOf(stream);
        if (index === -1) {
          return;
        }
        this._localStreams.splice(index, 1);
        const tracks = stream.getTracks();
        this.getSenders().forEach((sender) => {
          if (tracks.includes(sender.track)) {
            this.removeTrack(sender);
          }
        });
      };
    }
  }
  function shimRemoteStreamsAPI(window2) {
    if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
      return;
    }
    if (!("getRemoteStreams" in window2.RTCPeerConnection.prototype)) {
      window2.RTCPeerConnection.prototype.getRemoteStreams = function getRemoteStreams() {
        return this._remoteStreams ? this._remoteStreams : [];
      };
    }
    if (!("onaddstream" in window2.RTCPeerConnection.prototype)) {
      Object.defineProperty(window2.RTCPeerConnection.prototype, "onaddstream", {
        get() {
          return this._onaddstream;
        },
        set(f) {
          if (this._onaddstream) {
            this.removeEventListener("addstream", this._onaddstream);
            this.removeEventListener("track", this._onaddstreampoly);
          }
          this.addEventListener("addstream", this._onaddstream = f);
          this.addEventListener("track", this._onaddstreampoly = (e) => {
            e.streams.forEach((stream) => {
              if (!this._remoteStreams) {
                this._remoteStreams = [];
              }
              if (this._remoteStreams.includes(stream)) {
                return;
              }
              this._remoteStreams.push(stream);
              const event = new Event("addstream");
              event.stream = stream;
              this.dispatchEvent(event);
            });
          });
        }
      });
      const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
      window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
        const pc = this;
        if (!this._onaddstreampoly) {
          this.addEventListener("track", this._onaddstreampoly = function(e) {
            e.streams.forEach((stream) => {
              if (!pc._remoteStreams) {
                pc._remoteStreams = [];
              }
              if (pc._remoteStreams.indexOf(stream) >= 0) {
                return;
              }
              pc._remoteStreams.push(stream);
              const event = new Event("addstream");
              event.stream = stream;
              pc.dispatchEvent(event);
            });
          });
        }
        return origSetRemoteDescription.apply(pc, arguments);
      };
    }
  }
  function shimCallbacksAPI(window2) {
    if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
      return;
    }
    const prototype = window2.RTCPeerConnection.prototype;
    const origCreateOffer = prototype.createOffer;
    const origCreateAnswer = prototype.createAnswer;
    const setLocalDescription = prototype.setLocalDescription;
    const setRemoteDescription = prototype.setRemoteDescription;
    const addIceCandidate = prototype.addIceCandidate;
    prototype.createOffer = function createOffer(successCallback, failureCallback) {
      const options = arguments.length >= 2 ? arguments[2] : arguments[0];
      const promise = origCreateOffer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.createAnswer = function createAnswer(successCallback, failureCallback) {
      const options = arguments.length >= 2 ? arguments[2] : arguments[0];
      const promise = origCreateAnswer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    let withCallback = function(description, successCallback, failureCallback) {
      const promise = setLocalDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setLocalDescription = withCallback;
    withCallback = function(description, successCallback, failureCallback) {
      const promise = setRemoteDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setRemoteDescription = withCallback;
    withCallback = function(candidate, successCallback, failureCallback) {
      const promise = addIceCandidate.apply(this, [candidate]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.addIceCandidate = withCallback;
  }
  function shimGetUserMedia3(window2) {
    const navigator2 = window2 && window2.navigator;
    if (navigator2.mediaDevices && navigator2.mediaDevices.getUserMedia) {
      const mediaDevices = navigator2.mediaDevices;
      const _getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
      navigator2.mediaDevices.getUserMedia = (constraints) => {
        return _getUserMedia(shimConstraints(constraints));
      };
    }
    if (!navigator2.getUserMedia && navigator2.mediaDevices && navigator2.mediaDevices.getUserMedia) {
      navigator2.getUserMedia = function getUserMedia(constraints, cb, errcb) {
        navigator2.mediaDevices.getUserMedia(constraints).then(cb, errcb);
      }.bind(navigator2);
    }
  }
  function shimConstraints(constraints) {
    if (constraints && constraints.video !== void 0) {
      return Object.assign(
        {},
        constraints,
        { video: compactObject(constraints.video) }
      );
    }
    return constraints;
  }
  function shimRTCIceServerUrls(window2) {
    if (!window2.RTCPeerConnection) {
      return;
    }
    const OrigPeerConnection = window2.RTCPeerConnection;
    window2.RTCPeerConnection = function RTCPeerConnection2(pcConfig, pcConstraints) {
      if (pcConfig && pcConfig.iceServers) {
        const newIceServers = [];
        for (let i = 0; i < pcConfig.iceServers.length; i++) {
          let server = pcConfig.iceServers[i];
          if (server.urls === void 0 && server.url) {
            deprecated("RTCIceServer.url", "RTCIceServer.urls");
            server = JSON.parse(JSON.stringify(server));
            server.urls = server.url;
            delete server.url;
            newIceServers.push(server);
          } else {
            newIceServers.push(pcConfig.iceServers[i]);
          }
        }
        pcConfig.iceServers = newIceServers;
      }
      return new OrigPeerConnection(pcConfig, pcConstraints);
    };
    window2.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
    if ("generateCertificate" in OrigPeerConnection) {
      Object.defineProperty(window2.RTCPeerConnection, "generateCertificate", {
        get() {
          return OrigPeerConnection.generateCertificate;
        }
      });
    }
  }
  function shimTrackEventTransceiver(window2) {
    if (typeof window2 === "object" && window2.RTCTrackEvent && "receiver" in window2.RTCTrackEvent.prototype && !("transceiver" in window2.RTCTrackEvent.prototype)) {
      Object.defineProperty(window2.RTCTrackEvent.prototype, "transceiver", {
        get() {
          return { receiver: this.receiver };
        }
      });
    }
  }
  function shimCreateOfferLegacy(window2) {
    const origCreateOffer = window2.RTCPeerConnection.prototype.createOffer;
    window2.RTCPeerConnection.prototype.createOffer = function createOffer(offerOptions) {
      if (offerOptions) {
        if (typeof offerOptions.offerToReceiveAudio !== "undefined") {
          offerOptions.offerToReceiveAudio = !!offerOptions.offerToReceiveAudio;
        }
        const audioTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "audio");
        if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
          if (audioTransceiver.direction === "sendrecv") {
            if (audioTransceiver.setDirection) {
              audioTransceiver.setDirection("sendonly");
            } else {
              audioTransceiver.direction = "sendonly";
            }
          } else if (audioTransceiver.direction === "recvonly") {
            if (audioTransceiver.setDirection) {
              audioTransceiver.setDirection("inactive");
            } else {
              audioTransceiver.direction = "inactive";
            }
          }
        } else if (offerOptions.offerToReceiveAudio === true && !audioTransceiver) {
          this.addTransceiver("audio", { direction: "recvonly" });
        }
        if (typeof offerOptions.offerToReceiveVideo !== "undefined") {
          offerOptions.offerToReceiveVideo = !!offerOptions.offerToReceiveVideo;
        }
        const videoTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video");
        if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
          if (videoTransceiver.direction === "sendrecv") {
            if (videoTransceiver.setDirection) {
              videoTransceiver.setDirection("sendonly");
            } else {
              videoTransceiver.direction = "sendonly";
            }
          } else if (videoTransceiver.direction === "recvonly") {
            if (videoTransceiver.setDirection) {
              videoTransceiver.setDirection("inactive");
            } else {
              videoTransceiver.direction = "inactive";
            }
          }
        } else if (offerOptions.offerToReceiveVideo === true && !videoTransceiver) {
          this.addTransceiver("video", { direction: "recvonly" });
        }
      }
      return origCreateOffer.apply(this, arguments);
    };
  }
  function shimAudioContext(window2) {
    if (typeof window2 !== "object" || window2.AudioContext) {
      return;
    }
    window2.AudioContext = window2.webkitAudioContext;
  }

  // node_modules/webrtc-adapter/src/js/common_shim.js
  var common_shim_exports = {};
  __export(common_shim_exports, {
    removeExtmapAllowMixed: () => removeExtmapAllowMixed,
    shimAddIceCandidateNullOrEmpty: () => shimAddIceCandidateNullOrEmpty,
    shimConnectionState: () => shimConnectionState,
    shimMaxMessageSize: () => shimMaxMessageSize,
    shimParameterlessSetLocalDescription: () => shimParameterlessSetLocalDescription,
    shimRTCIceCandidate: () => shimRTCIceCandidate,
    shimRTCIceCandidateRelayProtocol: () => shimRTCIceCandidateRelayProtocol,
    shimSendThrowTypeError: () => shimSendThrowTypeError
  });
  var import_sdp = __toESM(require_sdp());
  function shimRTCIceCandidate(window2) {
    if (!window2.RTCIceCandidate || window2.RTCIceCandidate && "foundation" in window2.RTCIceCandidate.prototype) {
      return;
    }
    const NativeRTCIceCandidate = window2.RTCIceCandidate;
    window2.RTCIceCandidate = function RTCIceCandidate(args) {
      if (typeof args === "object" && args.candidate && args.candidate.indexOf("a=") === 0) {
        args = JSON.parse(JSON.stringify(args));
        args.candidate = args.candidate.substring(2);
      }
      if (args.candidate && args.candidate.length) {
        const nativeCandidate = new NativeRTCIceCandidate(args);
        const parsedCandidate = import_sdp.default.parseCandidate(args.candidate);
        for (const key in parsedCandidate) {
          if (!(key in nativeCandidate)) {
            Object.defineProperty(
              nativeCandidate,
              key,
              { value: parsedCandidate[key] }
            );
          }
        }
        nativeCandidate.toJSON = function toJSON() {
          return {
            candidate: nativeCandidate.candidate,
            sdpMid: nativeCandidate.sdpMid,
            sdpMLineIndex: nativeCandidate.sdpMLineIndex,
            usernameFragment: nativeCandidate.usernameFragment
          };
        };
        return nativeCandidate;
      }
      return new NativeRTCIceCandidate(args);
    };
    window2.RTCIceCandidate.prototype = NativeRTCIceCandidate.prototype;
    wrapPeerConnectionEvent(window2, "icecandidate", (e) => {
      if (e.candidate) {
        Object.defineProperty(e, "candidate", {
          value: new window2.RTCIceCandidate(e.candidate),
          writable: "false"
        });
      }
      return e;
    });
  }
  function shimRTCIceCandidateRelayProtocol(window2) {
    if (!window2.RTCIceCandidate || window2.RTCIceCandidate && "relayProtocol" in window2.RTCIceCandidate.prototype) {
      return;
    }
    wrapPeerConnectionEvent(window2, "icecandidate", (e) => {
      if (e.candidate) {
        const parsedCandidate = import_sdp.default.parseCandidate(e.candidate.candidate);
        if (parsedCandidate.type === "relay") {
          e.candidate.relayProtocol = {
            0: "tls",
            1: "tcp",
            2: "udp"
          }[parsedCandidate.priority >> 24];
        }
      }
      return e;
    });
  }
  function shimMaxMessageSize(window2, browserDetails) {
    if (!window2.RTCPeerConnection) {
      return;
    }
    if (browserDetails.browser === "chrome" && browserDetails.version > 102) {
      return;
    }
    if (browserDetails.browser === "firefox" && browserDetails.version >= 113) {
      return;
    }
    if (!("sctp" in window2.RTCPeerConnection.prototype)) {
      Object.defineProperty(window2.RTCPeerConnection.prototype, "sctp", {
        get() {
          return typeof this._sctp === "undefined" ? null : this._sctp;
        }
      });
    }
    const sctpInDescription = function(description) {
      if (!description || !description.sdp) {
        return false;
      }
      const sections = import_sdp.default.splitSections(description.sdp);
      sections.shift();
      return sections.some((mediaSection) => {
        const mLine = import_sdp.default.parseMLine(mediaSection);
        return mLine && mLine.kind === "application" && mLine.protocol.indexOf("SCTP") !== -1;
      });
    };
    const getRemoteFirefoxVersion = function(description) {
      const match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
      if (match === null || match.length < 2) {
        return -1;
      }
      const version = parseInt(match[1], 10);
      return version !== version ? -1 : version;
    };
    const getCanSendMaxMessageSize = function(remoteIsFirefox) {
      let canSendMaxMessageSize = 65536;
      if (browserDetails.browser === "firefox") {
        if (browserDetails.version < 57) {
          if (remoteIsFirefox === -1) {
            canSendMaxMessageSize = 16384;
          } else {
            canSendMaxMessageSize = 2147483637;
          }
        } else if (browserDetails.version < 60) {
          canSendMaxMessageSize = browserDetails.version === 57 ? 65535 : 65536;
        } else {
          canSendMaxMessageSize = 2147483637;
        }
      }
      return canSendMaxMessageSize;
    };
    const getMaxMessageSize = function(description, remoteIsFirefox) {
      let maxMessageSize = 65536;
      if (browserDetails.browser === "firefox" && browserDetails.version === 57) {
        maxMessageSize = 65535;
      }
      const match = import_sdp.default.matchPrefix(
        description.sdp,
        "a=max-message-size:"
      );
      if (match.length > 0) {
        maxMessageSize = parseInt(match[0].substring(19), 10);
      } else if (browserDetails.browser === "firefox" && remoteIsFirefox !== -1) {
        maxMessageSize = 2147483637;
      }
      return maxMessageSize;
    };
    const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
    window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
      this._sctp = null;
      if (browserDetails.browser === "chrome" && browserDetails.version >= 76) {
        const { sdpSemantics } = this.getConfiguration();
        if (sdpSemantics === "plan-b") {
          Object.defineProperty(this, "sctp", {
            get() {
              return typeof this._sctp === "undefined" ? null : this._sctp;
            },
            enumerable: true,
            configurable: true
          });
        }
      }
      if (sctpInDescription(arguments[0])) {
        const isFirefox = getRemoteFirefoxVersion(arguments[0]);
        const canSendMMS = getCanSendMaxMessageSize(isFirefox);
        const remoteMMS = getMaxMessageSize(arguments[0], isFirefox);
        let maxMessageSize;
        if (canSendMMS === 0 && remoteMMS === 0) {
          maxMessageSize = Number.POSITIVE_INFINITY;
        } else if (canSendMMS === 0 || remoteMMS === 0) {
          maxMessageSize = Math.max(canSendMMS, remoteMMS);
        } else {
          maxMessageSize = Math.min(canSendMMS, remoteMMS);
        }
        const sctp = {};
        Object.defineProperty(sctp, "maxMessageSize", {
          get() {
            return maxMessageSize;
          }
        });
        this._sctp = sctp;
      }
      return origSetRemoteDescription.apply(this, arguments);
    };
  }
  function shimSendThrowTypeError(window2, browserDetails) {
    if (!(window2.RTCPeerConnection && "createDataChannel" in window2.RTCPeerConnection.prototype)) {
      return;
    }
    if (browserDetails.browser === "chrome" && browserDetails.version >= 149) {
      return;
    }
    if (browserDetails.browser === "firefox" && browserDetails.version > 60) {
      return;
    }
    function wrapDcSend(dc, pc) {
      const origDataChannelSend = dc.send;
      dc.send = function send() {
        const data = arguments[0];
        const length = data.length || data.size || data.byteLength;
        if (dc.readyState === "open" && pc.sctp && length > pc.sctp.maxMessageSize) {
          throw new TypeError("Message too large (can send a maximum of " + pc.sctp.maxMessageSize + " bytes)");
        }
        return origDataChannelSend.apply(dc, arguments);
      };
    }
    const origCreateDataChannel = window2.RTCPeerConnection.prototype.createDataChannel;
    window2.RTCPeerConnection.prototype.createDataChannel = function createDataChannel() {
      const dataChannel = origCreateDataChannel.apply(this, arguments);
      wrapDcSend(dataChannel, this);
      return dataChannel;
    };
    wrapPeerConnectionEvent(window2, "datachannel", (e) => {
      wrapDcSend(e.channel, e.target);
      return e;
    });
  }
  function shimConnectionState(window2) {
    if (!window2.RTCPeerConnection || "connectionState" in window2.RTCPeerConnection.prototype) {
      return;
    }
    const proto = window2.RTCPeerConnection.prototype;
    Object.defineProperty(proto, "connectionState", {
      get() {
        return {
          completed: "connected",
          checking: "connecting"
        }[this.iceConnectionState] || this.iceConnectionState;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(proto, "onconnectionstatechange", {
      get() {
        return this._onconnectionstatechange || null;
      },
      set(cb) {
        if (this._onconnectionstatechange) {
          this.removeEventListener(
            "connectionstatechange",
            this._onconnectionstatechange
          );
          delete this._onconnectionstatechange;
        }
        if (cb) {
          this.addEventListener(
            "connectionstatechange",
            this._onconnectionstatechange = cb
          );
        }
      },
      enumerable: true,
      configurable: true
    });
    ["setLocalDescription", "setRemoteDescription"].forEach((method) => {
      const origMethod = proto[method];
      proto[method] = function() {
        if (!this._connectionstatechangepoly) {
          this._connectionstatechangepoly = (e) => {
            const pc = e.target;
            if (pc._lastConnectionState !== pc.connectionState) {
              pc._lastConnectionState = pc.connectionState;
              const newEvent = new Event("connectionstatechange", e);
              pc.dispatchEvent(newEvent);
            }
            return e;
          };
          this.addEventListener(
            "iceconnectionstatechange",
            this._connectionstatechangepoly
          );
        }
        return origMethod.apply(this, arguments);
      };
    });
  }
  function removeExtmapAllowMixed(window2, browserDetails) {
    if (!window2.RTCPeerConnection) {
      return;
    }
    if (browserDetails.browser === "chrome" && browserDetails.version >= 71) {
      return;
    }
    if (browserDetails.browser === "safari" && browserDetails._safariVersion >= 13.1) {
      return;
    }
    const nativeSRD = window2.RTCPeerConnection.prototype.setRemoteDescription;
    window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(desc) {
      if (desc && desc.sdp && desc.sdp.indexOf("\na=extmap-allow-mixed") !== -1) {
        const sdp2 = desc.sdp.split("\n").filter((line) => {
          return line.trim() !== "a=extmap-allow-mixed";
        }).join("\n");
        if (window2.RTCSessionDescription && desc instanceof window2.RTCSessionDescription) {
          arguments[0] = new window2.RTCSessionDescription({
            type: desc.type,
            sdp: sdp2
          });
        } else {
          desc.sdp = sdp2;
        }
      }
      return nativeSRD.apply(this, arguments);
    };
  }
  function shimAddIceCandidateNullOrEmpty(window2, browserDetails) {
    if (!(window2.RTCPeerConnection && window2.RTCPeerConnection.prototype)) {
      return;
    }
    const nativeAddIceCandidate = window2.RTCPeerConnection.prototype.addIceCandidate;
    if (!nativeAddIceCandidate || nativeAddIceCandidate.length === 0) {
      return;
    }
    window2.RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      if ((browserDetails.browser === "chrome" && browserDetails.version < 78 || browserDetails.browser === "firefox" && browserDetails.version < 68 || browserDetails.browser === "safari") && arguments[0] && arguments[0].candidate === "") {
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };
  }
  function shimParameterlessSetLocalDescription(window2, browserDetails) {
    if (!(window2.RTCPeerConnection && window2.RTCPeerConnection.prototype)) {
      return;
    }
    const nativeSetLocalDescription = window2.RTCPeerConnection.prototype.setLocalDescription;
    if (!nativeSetLocalDescription || nativeSetLocalDescription.length === 0) {
      return;
    }
    window2.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
      let desc = arguments[0] || {};
      if (typeof desc !== "object" || desc.type && desc.sdp) {
        return nativeSetLocalDescription.apply(this, arguments);
      }
      desc = { type: desc.type, sdp: desc.sdp };
      if (!desc.type) {
        switch (this.signalingState) {
          case "stable":
          case "have-local-offer":
          case "have-remote-pranswer":
            desc.type = "offer";
            break;
          default:
            desc.type = "answer";
            break;
        }
      }
      if (desc.sdp || desc.type !== "offer" && desc.type !== "answer") {
        return nativeSetLocalDescription.apply(this, [desc]);
      }
      const func = desc.type === "offer" ? this.createOffer : this.createAnswer;
      return func.apply(this).then((d) => nativeSetLocalDescription.apply(this, [d]));
    };
  }

  // node_modules/webrtc-adapter/src/js/adapter_factory.js
  var sdp = __toESM(require_sdp());
  function adapterFactory({ window: window2 } = {}, options = {
    shimChrome: true,
    shimFirefox: true,
    shimSafari: true
  }) {
    const logging2 = log;
    const browserDetails = detectBrowser(window2);
    const adapter2 = {
      browserDetails,
      commonShim: common_shim_exports,
      extractVersion,
      disableLog,
      disableWarnings,
      // Expose sdp as a convenience. For production apps include directly.
      sdp
    };
    switch (browserDetails.browser) {
      case "chrome":
        if (!chrome_shim_exports || !shimPeerConnection || !options.shimChrome) {
          logging2("Chrome shim is not included in this adapter release.");
          return adapter2;
        }
        if (browserDetails.version === null) {
          logging2("Chrome shim can not determine version, not shimming.");
          return adapter2;
        }
        logging2("adapter.js shimming chrome.");
        adapter2.browserShim = chrome_shim_exports;
        shimAddIceCandidateNullOrEmpty(window2, browserDetails);
        shimParameterlessSetLocalDescription(window2, browserDetails);
        shimGetUserMedia(window2, browserDetails);
        shimMediaStream(window2, browserDetails);
        shimPeerConnection(window2, browserDetails);
        shimOnTrack(window2, browserDetails);
        shimAddTrackRemoveTrack(window2, browserDetails);
        shimGetSendersWithDtmf(window2, browserDetails);
        shimSenderReceiverGetStats(window2, browserDetails);
        fixNegotiationNeeded(window2, browserDetails);
        shimRTCIceCandidate(window2, browserDetails);
        shimRTCIceCandidateRelayProtocol(window2, browserDetails);
        shimConnectionState(window2, browserDetails);
        shimMaxMessageSize(window2, browserDetails);
        shimSendThrowTypeError(window2, browserDetails);
        removeExtmapAllowMixed(window2, browserDetails);
        break;
      case "firefox":
        if (!firefox_shim_exports || !shimPeerConnection2 || !options.shimFirefox) {
          logging2("Firefox shim is not included in this adapter release.");
          return adapter2;
        }
        logging2("adapter.js shimming firefox.");
        adapter2.browserShim = firefox_shim_exports;
        shimAddIceCandidateNullOrEmpty(window2, browserDetails);
        shimParameterlessSetLocalDescription(window2, browserDetails);
        shimGetUserMedia2(window2, browserDetails);
        shimPeerConnection2(window2, browserDetails);
        shimGetStats(window2, browserDetails);
        shimOnTrack2(window2, browserDetails);
        shimRemoveStream(window2, browserDetails);
        shimSenderGetStats(window2, browserDetails);
        shimReceiverGetStats(window2, browserDetails);
        shimRTCDataChannel(window2, browserDetails);
        shimAddTransceiver(window2, browserDetails);
        shimGetParameters(window2, browserDetails);
        shimCreateOffer(window2, browserDetails);
        shimCreateAnswer(window2, browserDetails);
        shimRTCIceCandidate(window2, browserDetails);
        shimConnectionState(window2, browserDetails);
        shimMaxMessageSize(window2, browserDetails);
        shimSendThrowTypeError(window2, browserDetails);
        break;
      case "safari":
        if (!safari_shim_exports || !options.shimSafari) {
          logging2("Safari shim is not included in this adapter release.");
          return adapter2;
        }
        logging2("adapter.js shimming safari.");
        adapter2.browserShim = safari_shim_exports;
        shimAddIceCandidateNullOrEmpty(window2, browserDetails);
        shimParameterlessSetLocalDescription(window2, browserDetails);
        shimRTCIceServerUrls(window2, browserDetails);
        shimCreateOfferLegacy(window2, browserDetails);
        shimCallbacksAPI(window2, browserDetails);
        shimLocalStreamsAPI(window2, browserDetails);
        shimRemoteStreamsAPI(window2, browserDetails);
        shimTrackEventTransceiver(window2, browserDetails);
        shimGetUserMedia3(window2, browserDetails);
        shimAudioContext(window2, browserDetails);
        shimRTCIceCandidate(window2, browserDetails);
        shimRTCIceCandidateRelayProtocol(window2, browserDetails);
        shimMaxMessageSize(window2, browserDetails);
        shimSendThrowTypeError(window2, browserDetails);
        removeExtmapAllowMixed(window2, browserDetails);
        break;
      default:
        logging2("Unsupported browser!");
        break;
    }
    return adapter2;
  }

  // node_modules/webrtc-adapter/src/js/adapter_core.js
  var adapter = adapterFactory({ window: typeof window === "undefined" ? void 0 : window });
  var adapter_core_default = adapter;

  // node_modules/peerjs/dist/bundler.mjs
  function $parcel$export(e, n, v, s) {
    Object.defineProperty(e, n, { get: v, set: s, enumerable: true, configurable: true });
  }
  var $fcbcc7538a6776d5$export$f1c5f4c9cb95390b = class {
    constructor() {
      this.chunkedMTU = 16300;
      this._dataCount = 1;
      this.chunk = (blob) => {
        const chunks = [];
        const size = blob.byteLength;
        const total = Math.ceil(size / this.chunkedMTU);
        let index = 0;
        let start = 0;
        while (start < size) {
          const end = Math.min(size, start + this.chunkedMTU);
          const b = blob.slice(start, end);
          const chunk = {
            __peerData: this._dataCount,
            n: index,
            data: b,
            total
          };
          chunks.push(chunk);
          start = end;
          index++;
        }
        this._dataCount++;
        return chunks;
      };
    }
  };
  function $fcbcc7538a6776d5$export$52c89ebcdc4f53f2(bufs) {
    let size = 0;
    for (const buf of bufs) size += buf.byteLength;
    const result = new Uint8Array(size);
    let offset = 0;
    for (const buf of bufs) {
      result.set(buf, offset);
      offset += buf.byteLength;
    }
    return result;
  }
  var $fb63e766cfafaab9$var$webRTCAdapter = (
    //@ts-ignore
    (0, adapter_core_default).default || (0, adapter_core_default)
  );
  var $fb63e766cfafaab9$export$25be9502477c137d = new class {
    isWebRTCSupported() {
      return typeof RTCPeerConnection !== "undefined";
    }
    isBrowserSupported() {
      const browser = this.getBrowser();
      const version = this.getVersion();
      const validBrowser = this.supportedBrowsers.includes(browser);
      if (!validBrowser) return false;
      if (browser === "chrome") return version >= this.minChromeVersion;
      if (browser === "firefox") return version >= this.minFirefoxVersion;
      if (browser === "safari") return !this.isIOS && version >= this.minSafariVersion;
      return false;
    }
    getBrowser() {
      return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.browser;
    }
    getVersion() {
      return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
    }
    isUnifiedPlanSupported() {
      const browser = this.getBrowser();
      const version = $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
      if (browser === "chrome" && version < this.minChromeVersion) return false;
      if (browser === "firefox" && version >= this.minFirefoxVersion) return true;
      if (!window.RTCRtpTransceiver || !("currentDirection" in RTCRtpTransceiver.prototype)) return false;
      let tempPc;
      let supported = false;
      try {
        tempPc = new RTCPeerConnection();
        tempPc.addTransceiver("audio");
        supported = true;
      } catch (e) {
      } finally {
        if (tempPc) tempPc.close();
      }
      return supported;
    }
    toString() {
      return `Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`;
    }
    constructor() {
      this.isIOS = typeof navigator !== "undefined" ? [
        "iPad",
        "iPhone",
        "iPod"
      ].includes(navigator.platform) : false;
      this.supportedBrowsers = [
        "firefox",
        "chrome",
        "safari"
      ];
      this.minFirefoxVersion = 59;
      this.minChromeVersion = 72;
      this.minSafariVersion = 605;
    }
  }();
  var $9a84a32bf0bf36bb$export$f35f128fd59ea256 = (id) => {
    return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(id);
  };
  var $0e5fd1585784c252$export$4e61f672936bec77 = () => Math.random().toString(36).slice(2);
  var $4f4134156c446392$var$DEFAULT_CONFIG = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      },
      {
        urls: [
          "turn:eu-0.turn.peerjs.com:3478",
          "turn:us-0.turn.peerjs.com:3478"
        ],
        username: "peerjs",
        credential: "peerjsp"
      }
    ],
    sdpSemantics: "unified-plan"
  };
  var $4f4134156c446392$export$f8f26dd395d7e1bd = class extends (0, $fcbcc7538a6776d5$export$f1c5f4c9cb95390b) {
    noop() {
    }
    blobToArrayBuffer(blob, cb) {
      const fr = new FileReader();
      fr.onload = function(evt) {
        if (evt.target) cb(evt.target.result);
      };
      fr.readAsArrayBuffer(blob);
      return fr;
    }
    binaryStringToArrayBuffer(binary) {
      const byteArray = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) byteArray[i] = binary.charCodeAt(i) & 255;
      return byteArray.buffer;
    }
    isSecure() {
      return location.protocol === "https:";
    }
    constructor(...args) {
      super(...args), this.CLOUD_HOST = "0.peerjs.com", this.CLOUD_PORT = 443, // Browsers that need chunking:
      this.chunkedBrowsers = {
        Chrome: 1,
        chrome: 1
      }, // Returns browser-agnostic default config
      this.defaultConfig = $4f4134156c446392$var$DEFAULT_CONFIG, this.browser = (0, $fb63e766cfafaab9$export$25be9502477c137d).getBrowser(), this.browserVersion = (0, $fb63e766cfafaab9$export$25be9502477c137d).getVersion(), this.pack = $0cfd7828ad59115f$export$2a703dbb0cb35339, this.unpack = $0cfd7828ad59115f$export$417857010dc9287f, /**
      * A hash of WebRTC features mapped to booleans that correspond to whether the feature is supported by the current browser.
      *
      * :::caution
      * Only the properties documented here are guaranteed to be present on `util.supports`
      * :::
      */
      this.supports = (function() {
        const supported = {
          browser: (0, $fb63e766cfafaab9$export$25be9502477c137d).isBrowserSupported(),
          webRTC: (0, $fb63e766cfafaab9$export$25be9502477c137d).isWebRTCSupported(),
          audioVideo: false,
          data: false,
          binaryBlob: false,
          reliable: false
        };
        if (!supported.webRTC) return supported;
        let pc;
        try {
          pc = new RTCPeerConnection($4f4134156c446392$var$DEFAULT_CONFIG);
          supported.audioVideo = true;
          let dc;
          try {
            dc = pc.createDataChannel("_PEERJSTEST", {
              ordered: true
            });
            supported.data = true;
            supported.reliable = !!dc.ordered;
            try {
              dc.binaryType = "blob";
              supported.binaryBlob = !(0, $fb63e766cfafaab9$export$25be9502477c137d).isIOS;
            } catch (e) {
            }
          } catch (e) {
          } finally {
            if (dc) dc.close();
          }
        } catch (e) {
        } finally {
          if (pc) pc.close();
        }
        return supported;
      })(), // Ensure alphanumeric ids
      this.validateId = (0, $9a84a32bf0bf36bb$export$f35f128fd59ea256), this.randomToken = (0, $0e5fd1585784c252$export$4e61f672936bec77);
    }
  };
  var $4f4134156c446392$export$7debb50ef11d5e0b = new $4f4134156c446392$export$f8f26dd395d7e1bd();
  var $257947e92926277a$var$LOG_PREFIX = "PeerJS: ";
  var $257947e92926277a$var$Logger = class {
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(logLevel) {
      this._logLevel = logLevel;
    }
    log(...args) {
      if (this._logLevel >= 3) this._print(3, ...args);
    }
    warn(...args) {
      if (this._logLevel >= 2) this._print(2, ...args);
    }
    error(...args) {
      if (this._logLevel >= 1) this._print(1, ...args);
    }
    setLogFunction(fn) {
      this._print = fn;
    }
    _print(logLevel, ...rest) {
      const copy = [
        $257947e92926277a$var$LOG_PREFIX,
        ...rest
      ];
      for (const i in copy) if (copy[i] instanceof Error) copy[i] = "(" + copy[i].name + ") " + copy[i].message;
      if (logLevel >= 3) console.log(...copy);
      else if (logLevel >= 2) console.warn("WARNING", ...copy);
      else if (logLevel >= 1) console.error("ERROR", ...copy);
    }
    constructor() {
      this._logLevel = 0;
    }
  };
  var $257947e92926277a$export$2e2bcd8739ae039 = new $257947e92926277a$var$Logger();
  var $c4dcfd1d1ea86647$exports = {};
  var $c4dcfd1d1ea86647$var$has = Object.prototype.hasOwnProperty;
  var $c4dcfd1d1ea86647$var$prefix = "~";
  function $c4dcfd1d1ea86647$var$Events() {
  }
  if (Object.create) {
    $c4dcfd1d1ea86647$var$Events.prototype = /* @__PURE__ */ Object.create(null);
    if (!new $c4dcfd1d1ea86647$var$Events().__proto__) $c4dcfd1d1ea86647$var$prefix = false;
  }
  function $c4dcfd1d1ea86647$var$EE(fn, context, once2) {
    this.fn = fn;
    this.context = context;
    this.once = once2 || false;
  }
  function $c4dcfd1d1ea86647$var$addListener(emitter, event, fn, context, once2) {
    if (typeof fn !== "function") throw new TypeError("The listener must be a function");
    var listener = new $c4dcfd1d1ea86647$var$EE(fn, context || emitter, once2), evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
    if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
    else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
    else emitter._events[evt] = [
      emitter._events[evt],
      listener
    ];
    return emitter;
  }
  function $c4dcfd1d1ea86647$var$clearEvent(emitter, evt) {
    if (--emitter._eventsCount === 0) emitter._events = new $c4dcfd1d1ea86647$var$Events();
    else delete emitter._events[evt];
  }
  function $c4dcfd1d1ea86647$var$EventEmitter() {
    this._events = new $c4dcfd1d1ea86647$var$Events();
    this._eventsCount = 0;
  }
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.eventNames = function eventNames() {
    var names = [], events, name;
    if (this._eventsCount === 0) return names;
    for (name in events = this._events) if ($c4dcfd1d1ea86647$var$has.call(events, name)) names.push($c4dcfd1d1ea86647$var$prefix ? name.slice(1) : name);
    if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
    return names;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.listeners = function listeners(event) {
    var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, handlers = this._events[evt];
    if (!handlers) return [];
    if (handlers.fn) return [
      handlers.fn
    ];
    for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
    return ee;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.listenerCount = function listenerCount(event) {
    var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, listeners2 = this._events[evt];
    if (!listeners2) return 0;
    if (listeners2.fn) return 1;
    return listeners2.length;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
    if (!this._events[evt]) return false;
    var listeners2 = this._events[evt], len = arguments.length, args, i;
    if (listeners2.fn) {
      if (listeners2.once) this.removeListener(event, listeners2.fn, void 0, true);
      switch (len) {
        case 1:
          return listeners2.fn.call(listeners2.context), true;
        case 2:
          return listeners2.fn.call(listeners2.context, a1), true;
        case 3:
          return listeners2.fn.call(listeners2.context, a1, a2), true;
        case 4:
          return listeners2.fn.call(listeners2.context, a1, a2, a3), true;
        case 5:
          return listeners2.fn.call(listeners2.context, a1, a2, a3, a4), true;
        case 6:
          return listeners2.fn.call(listeners2.context, a1, a2, a3, a4, a5), true;
      }
      for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
      listeners2.fn.apply(listeners2.context, args);
    } else {
      var length = listeners2.length, j;
      for (i = 0; i < length; i++) {
        if (listeners2[i].once) this.removeListener(event, listeners2[i].fn, void 0, true);
        switch (len) {
          case 1:
            listeners2[i].fn.call(listeners2[i].context);
            break;
          case 2:
            listeners2[i].fn.call(listeners2[i].context, a1);
            break;
          case 3:
            listeners2[i].fn.call(listeners2[i].context, a1, a2);
            break;
          case 4:
            listeners2[i].fn.call(listeners2[i].context, a1, a2, a3);
            break;
          default:
            if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
            listeners2[i].fn.apply(listeners2[i].context, args);
        }
      }
    }
    return true;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.on = function on(event, fn, context) {
    return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, false);
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.once = function once(event, fn, context) {
    return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, true);
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once2) {
    var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
    if (!this._events[evt]) return this;
    if (!fn) {
      $c4dcfd1d1ea86647$var$clearEvent(this, evt);
      return this;
    }
    var listeners2 = this._events[evt];
    if (listeners2.fn) {
      if (listeners2.fn === fn && (!once2 || listeners2.once) && (!context || listeners2.context === context)) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
    } else {
      for (var i = 0, events = [], length = listeners2.length; i < length; i++) if (listeners2[i].fn !== fn || once2 && !listeners2[i].once || context && listeners2[i].context !== context) events.push(listeners2[i]);
      if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
      else $c4dcfd1d1ea86647$var$clearEvent(this, evt);
    }
    return this;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    var evt;
    if (event) {
      evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
      if (this._events[evt]) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
    } else {
      this._events = new $c4dcfd1d1ea86647$var$Events();
      this._eventsCount = 0;
    }
    return this;
  };
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.off = $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener;
  $c4dcfd1d1ea86647$var$EventEmitter.prototype.addListener = $c4dcfd1d1ea86647$var$EventEmitter.prototype.on;
  $c4dcfd1d1ea86647$var$EventEmitter.prefixed = $c4dcfd1d1ea86647$var$prefix;
  $c4dcfd1d1ea86647$var$EventEmitter.EventEmitter = $c4dcfd1d1ea86647$var$EventEmitter;
  $c4dcfd1d1ea86647$exports = $c4dcfd1d1ea86647$var$EventEmitter;
  var $78455e22dea96b8c$exports = {};
  $parcel$export($78455e22dea96b8c$exports, "ConnectionType", () => $78455e22dea96b8c$export$3157d57b4135e3bc);
  $parcel$export($78455e22dea96b8c$exports, "PeerErrorType", () => $78455e22dea96b8c$export$9547aaa2e39030ff);
  $parcel$export($78455e22dea96b8c$exports, "BaseConnectionErrorType", () => $78455e22dea96b8c$export$7974935686149686);
  $parcel$export($78455e22dea96b8c$exports, "DataConnectionErrorType", () => $78455e22dea96b8c$export$49ae800c114df41d);
  $parcel$export($78455e22dea96b8c$exports, "SerializationType", () => $78455e22dea96b8c$export$89f507cf986a947);
  $parcel$export($78455e22dea96b8c$exports, "SocketEventType", () => $78455e22dea96b8c$export$3b5c4a4b6354f023);
  $parcel$export($78455e22dea96b8c$exports, "ServerMessageType", () => $78455e22dea96b8c$export$adb4a1754da6f10d);
  var $78455e22dea96b8c$export$3157d57b4135e3bc = /* @__PURE__ */ (function(ConnectionType) {
    ConnectionType["Data"] = "data";
    ConnectionType["Media"] = "media";
    return ConnectionType;
  })({});
  var $78455e22dea96b8c$export$9547aaa2e39030ff = /* @__PURE__ */ (function(PeerErrorType) {
    PeerErrorType["BrowserIncompatible"] = "browser-incompatible";
    PeerErrorType["Disconnected"] = "disconnected";
    PeerErrorType["InvalidID"] = "invalid-id";
    PeerErrorType["InvalidKey"] = "invalid-key";
    PeerErrorType["Network"] = "network";
    PeerErrorType["PeerUnavailable"] = "peer-unavailable";
    PeerErrorType["SslUnavailable"] = "ssl-unavailable";
    PeerErrorType["ServerError"] = "server-error";
    PeerErrorType["SocketError"] = "socket-error";
    PeerErrorType["SocketClosed"] = "socket-closed";
    PeerErrorType["UnavailableID"] = "unavailable-id";
    PeerErrorType["WebRTC"] = "webrtc";
    return PeerErrorType;
  })({});
  var $78455e22dea96b8c$export$7974935686149686 = /* @__PURE__ */ (function(BaseConnectionErrorType) {
    BaseConnectionErrorType["NegotiationFailed"] = "negotiation-failed";
    BaseConnectionErrorType["ConnectionClosed"] = "connection-closed";
    return BaseConnectionErrorType;
  })({});
  var $78455e22dea96b8c$export$49ae800c114df41d = /* @__PURE__ */ (function(DataConnectionErrorType) {
    DataConnectionErrorType["NotOpenYet"] = "not-open-yet";
    DataConnectionErrorType["MessageToBig"] = "message-too-big";
    return DataConnectionErrorType;
  })({});
  var $78455e22dea96b8c$export$89f507cf986a947 = /* @__PURE__ */ (function(SerializationType) {
    SerializationType["Binary"] = "binary";
    SerializationType["BinaryUTF8"] = "binary-utf8";
    SerializationType["JSON"] = "json";
    SerializationType["None"] = "raw";
    return SerializationType;
  })({});
  var $78455e22dea96b8c$export$3b5c4a4b6354f023 = /* @__PURE__ */ (function(SocketEventType) {
    SocketEventType["Message"] = "message";
    SocketEventType["Disconnected"] = "disconnected";
    SocketEventType["Error"] = "error";
    SocketEventType["Close"] = "close";
    return SocketEventType;
  })({});
  var $78455e22dea96b8c$export$adb4a1754da6f10d = /* @__PURE__ */ (function(ServerMessageType) {
    ServerMessageType["Heartbeat"] = "HEARTBEAT";
    ServerMessageType["Candidate"] = "CANDIDATE";
    ServerMessageType["Offer"] = "OFFER";
    ServerMessageType["Answer"] = "ANSWER";
    ServerMessageType["Open"] = "OPEN";
    ServerMessageType["Error"] = "ERROR";
    ServerMessageType["IdTaken"] = "ID-TAKEN";
    ServerMessageType["InvalidKey"] = "INVALID-KEY";
    ServerMessageType["Leave"] = "LEAVE";
    ServerMessageType["Expire"] = "EXPIRE";
    return ServerMessageType;
  })({});
  var $520832d44ba058c8$export$83d89fbfd8236492 = "1.5.5";
  var $8f5bfa60836d261d$export$4798917dbf149b79 = class extends (0, $c4dcfd1d1ea86647$exports.EventEmitter) {
    constructor(secure, host, port, path, key, pingInterval = 5e3) {
      super(), this.pingInterval = pingInterval, this._disconnected = true, this._messagesQueue = [];
      const wsProtocol = secure ? "wss://" : "ws://";
      this._baseUrl = wsProtocol + host + ":" + port + path + "peerjs?key=" + key;
    }
    start(id, token) {
      this._id = id;
      const wsUrl = `${this._baseUrl}&id=${id}&token=${token}`;
      if (!!this._socket || !this._disconnected) return;
      this._socket = new WebSocket(wsUrl + "&version=" + (0, $520832d44ba058c8$export$83d89fbfd8236492));
      this._disconnected = false;
      this._socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
          (0, $257947e92926277a$export$2e2bcd8739ae039).log("Server message received:", data);
        } catch (e) {
          (0, $257947e92926277a$export$2e2bcd8739ae039).log("Invalid server message", event.data);
          return;
        }
        this.emit((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Message, data);
      };
      this._socket.onclose = (event) => {
        if (this._disconnected) return;
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Socket closed.", event);
        this._cleanup();
        this._disconnected = true;
        this.emit((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Disconnected);
      };
      this._socket.onopen = () => {
        if (this._disconnected) return;
        this._sendQueuedMessages();
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Socket open");
        this._scheduleHeartbeat();
      };
    }
    _scheduleHeartbeat() {
      this._wsPingTimer = setTimeout(() => {
        this._sendHeartbeat();
      }, this.pingInterval);
    }
    _sendHeartbeat() {
      if (!this._wsOpen()) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Cannot send heartbeat, because socket closed`);
        return;
      }
      const message = JSON.stringify({
        type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Heartbeat
      });
      this._socket.send(message);
      this._scheduleHeartbeat();
    }
    /** Is the websocket currently open? */
    _wsOpen() {
      return !!this._socket && this._socket.readyState === 1;
    }
    /** Send queued messages. */
    _sendQueuedMessages() {
      const copiedQueue = [
        ...this._messagesQueue
      ];
      this._messagesQueue = [];
      for (const message of copiedQueue) this.send(message);
    }
    /** Exposed send for DC & Peer. */
    send(data) {
      if (this._disconnected) return;
      if (!this._id) {
        this._messagesQueue.push(data);
        return;
      }
      if (!data.type) {
        this.emit((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Error, "Invalid message");
        return;
      }
      if (!this._wsOpen()) return;
      const message = JSON.stringify(data);
      this._socket.send(message);
    }
    close() {
      if (this._disconnected) return;
      this._cleanup();
      this._disconnected = true;
    }
    _cleanup() {
      if (this._socket) {
        this._socket.onopen = this._socket.onmessage = this._socket.onclose = null;
        this._socket.close();
        this._socket = void 0;
      }
      clearTimeout(this._wsPingTimer);
    }
  };
  var $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a = class {
    constructor(connection) {
      this.connection = connection;
    }
    /** Returns a PeerConnection object set up correctly (for data, media). */
    startConnection(options) {
      const peerConnection = this._startPeerConnection();
      this.connection.peerConnection = peerConnection;
      if (this.connection.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Media && options._stream) this._addTracksToConnection(options._stream, peerConnection);
      if (options.originator) {
        const dataConnection = this.connection;
        const config = {
          ordered: !!options.reliable
        };
        const dataChannel = peerConnection.createDataChannel(dataConnection.label, config);
        dataConnection._initializeDataChannel(dataChannel);
        this._makeOffer();
      } else this.handleSDP("OFFER", options.sdp);
    }
    /** Start a PC. */
    _startPeerConnection() {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Creating RTCPeerConnection.");
      const peerConnection = new RTCPeerConnection(this.connection.provider.options.config);
      this._setupListeners(peerConnection);
      return peerConnection;
    }
    /** Set up various WebRTC listeners. */
    _setupListeners(peerConnection) {
      const peerId = this.connection.peer;
      const connectionId = this.connection.connectionId;
      const connectionType = this.connection.type;
      const provider = this.connection.provider;
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Listening for ICE candidates.");
      peerConnection.onicecandidate = (evt) => {
        if (!evt.candidate || !evt.candidate.candidate) return;
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Received ICE candidates for ${peerId}:`, evt.candidate);
        provider.socket.send({
          type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Candidate,
          payload: {
            candidate: evt.candidate,
            type: connectionType,
            connectionId
          },
          dst: peerId
        });
      };
      peerConnection.oniceconnectionstatechange = () => {
        switch (peerConnection.iceConnectionState) {
          case "failed":
            (0, $257947e92926277a$export$2e2bcd8739ae039).log("iceConnectionState is failed, closing connections to " + peerId);
            this.connection.emitError((0, $78455e22dea96b8c$export$7974935686149686).NegotiationFailed, "Negotiation of connection to " + peerId + " failed.");
            this.connection.close();
            break;
          case "closed":
            (0, $257947e92926277a$export$2e2bcd8739ae039).log("iceConnectionState is closed, closing connections to " + peerId);
            this.connection.emitError((0, $78455e22dea96b8c$export$7974935686149686).ConnectionClosed, "Connection to " + peerId + " closed.");
            this.connection.close();
            break;
          case "disconnected":
            (0, $257947e92926277a$export$2e2bcd8739ae039).log("iceConnectionState changed to disconnected on the connection with " + peerId);
            break;
          case "completed":
            peerConnection.onicecandidate = () => {
            };
            break;
        }
        this.connection.emit("iceStateChanged", peerConnection.iceConnectionState);
      };
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Listening for data channel");
      peerConnection.ondatachannel = (evt) => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Received data channel");
        const dataChannel = evt.channel;
        const connection = provider.getConnection(peerId, connectionId);
        connection._initializeDataChannel(dataChannel);
      };
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Listening for remote stream");
      peerConnection.ontrack = (evt) => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Received remote stream");
        const stream = evt.streams[0];
        const connection = provider.getConnection(peerId, connectionId);
        if (connection.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Media) {
          const mediaConnection = connection;
          this._addStreamToMediaConnection(stream, mediaConnection);
        }
      };
    }
    cleanup() {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Cleaning up PeerConnection to " + this.connection.peer);
      const peerConnection = this.connection.peerConnection;
      if (!peerConnection) return;
      this.connection.peerConnection = null;
      peerConnection.onicecandidate = peerConnection.oniceconnectionstatechange = peerConnection.ondatachannel = peerConnection.ontrack = () => {
      };
      const peerConnectionNotClosed = peerConnection.signalingState !== "closed";
      let dataChannelNotClosed = false;
      const dataChannel = this.connection.dataChannel;
      if (dataChannel) dataChannelNotClosed = !!dataChannel.readyState && dataChannel.readyState !== "closed";
      if (peerConnectionNotClosed || dataChannelNotClosed) peerConnection.close();
    }
    async _makeOffer() {
      const peerConnection = this.connection.peerConnection;
      const provider = this.connection.provider;
      try {
        const offer = await peerConnection.createOffer(this.connection.options.constraints);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Created offer.");
        if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") offer.sdp = this.connection.options.sdpTransform(offer.sdp) || offer.sdp;
        try {
          await peerConnection.setLocalDescription(offer);
          (0, $257947e92926277a$export$2e2bcd8739ae039).log("Set localDescription:", offer, `for:${this.connection.peer}`);
          let payload = {
            sdp: offer,
            type: this.connection.type,
            connectionId: this.connection.connectionId,
            metadata: this.connection.metadata
          };
          if (this.connection.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Data) {
            const dataConnection = this.connection;
            payload = {
              ...payload,
              label: dataConnection.label,
              reliable: dataConnection.reliable,
              serialization: dataConnection.serialization
            };
          }
          provider.socket.send({
            type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Offer,
            payload,
            dst: this.connection.peer
          });
        } catch (err) {
          if (err != "OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer") {
            provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
            (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to setLocalDescription, ", err);
          }
        }
      } catch (err_1) {
        provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err_1);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to createOffer, ", err_1);
      }
    }
    async _makeAnswer() {
      const peerConnection = this.connection.peerConnection;
      const provider = this.connection.provider;
      try {
        const answer = await peerConnection.createAnswer();
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Created answer.");
        if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") answer.sdp = this.connection.options.sdpTransform(answer.sdp) || answer.sdp;
        try {
          await peerConnection.setLocalDescription(answer);
          (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Set localDescription:`, answer, `for:${this.connection.peer}`);
          provider.socket.send({
            type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Answer,
            payload: {
              sdp: answer,
              type: this.connection.type,
              connectionId: this.connection.connectionId
            },
            dst: this.connection.peer
          });
        } catch (err) {
          provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
          (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to setLocalDescription, ", err);
        }
      } catch (err_1) {
        provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err_1);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to create answer, ", err_1);
      }
    }
    /** Handle an SDP. */
    async handleSDP(type, sdp2) {
      sdp2 = new RTCSessionDescription(sdp2);
      const peerConnection = this.connection.peerConnection;
      const provider = this.connection.provider;
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Setting remote description", sdp2);
      const self = this;
      try {
        await peerConnection.setRemoteDescription(sdp2);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Set remoteDescription:${type} for:${this.connection.peer}`);
        if (type === "OFFER") await self._makeAnswer();
      } catch (err) {
        provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to setRemoteDescription, ", err);
      }
    }
    /** Handle a candidate. */
    async handleCandidate(ice) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`handleCandidate:`, ice);
      try {
        await this.connection.peerConnection.addIceCandidate(ice);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Added ICE candidate for:${this.connection.peer}`);
      } catch (err) {
        this.connection.provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to handleCandidate, ", err);
      }
    }
    _addTracksToConnection(stream, peerConnection) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`add tracks from stream ${stream.id} to peer connection`);
      if (!peerConnection.addTrack) return (0, $257947e92926277a$export$2e2bcd8739ae039).error(`Your browser does't support RTCPeerConnection#addTrack. Ignored.`);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    }
    _addStreamToMediaConnection(stream, mediaConnection) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`add stream ${stream.id} to media connection ${mediaConnection.connectionId}`);
      mediaConnection.addStream(stream);
    }
  };
  var $23779d1881157a18$export$6a678e589c8a4542 = class extends (0, $c4dcfd1d1ea86647$exports.EventEmitter) {
    /**
    * Emits a typed error message.
    *
    * @internal
    */
    emitError(type, err) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).error("Error:", err);
      this.emit("error", new $23779d1881157a18$export$98871882f492de82(`${type}`, err));
    }
  };
  var $23779d1881157a18$export$98871882f492de82 = class extends Error {
    /**
    * @internal
    */
    constructor(type, err) {
      if (typeof err === "string") super(err);
      else {
        super();
        Object.assign(this, err);
      }
      this.type = type;
    }
  };
  var $5045192fc6d387ba$export$23a2a68283c24d80 = class extends (0, $23779d1881157a18$export$6a678e589c8a4542) {
    /**
    * Whether the media connection is active (e.g. your call has been answered).
    * You can check this if you want to set a maximum wait time for a one-sided call.
    */
    get open() {
      return this._open;
    }
    constructor(peer, provider, options) {
      super(), this.peer = peer, this.provider = provider, this.options = options, this._open = false;
      this.metadata = options.metadata;
    }
  };
  var $5c1d08c7c57da9a3$export$4a84e95a2324ac29 = class _$5c1d08c7c57da9a3$export$4a84e95a2324ac29 extends (0, $5045192fc6d387ba$export$23a2a68283c24d80) {
    static #_ = this.ID_PREFIX = "mc_";
    /**
    * For media connections, this is always 'media'.
    */
    get type() {
      return (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Media;
    }
    get localStream() {
      return this._localStream;
    }
    get remoteStream() {
      return this._remoteStream;
    }
    constructor(peerId, provider, options) {
      super(peerId, provider, options);
      this._localStream = this.options._stream;
      this.connectionId = this.options.connectionId || _$5c1d08c7c57da9a3$export$4a84e95a2324ac29.ID_PREFIX + (0, $4f4134156c446392$export$7debb50ef11d5e0b).randomToken();
      this._negotiator = new (0, $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a)(this);
      if (this._localStream) this._negotiator.startConnection({
        _stream: this._localStream,
        originator: true
      });
    }
    /** Called by the Negotiator when the DataChannel is ready. */
    _initializeDataChannel(dc) {
      this.dataChannel = dc;
      this.dataChannel.onopen = () => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} dc connection success`);
        this.emit("willCloseOnRemote");
      };
      this.dataChannel.onclose = () => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} dc closed for:`, this.peer);
        this.close();
      };
    }
    addStream(remoteStream) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Receiving stream", remoteStream);
      this._remoteStream = remoteStream;
      super.emit("stream", remoteStream);
    }
    /**
    * @internal
    */
    handleMessage(message) {
      const type = message.type;
      const payload = message.payload;
      switch (message.type) {
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Answer:
          this._negotiator.handleSDP(type, payload.sdp);
          this._open = true;
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Candidate:
          this._negotiator.handleCandidate(payload.candidate);
          break;
        default:
          (0, $257947e92926277a$export$2e2bcd8739ae039).warn(`Unrecognized message type:${type} from peer:${this.peer}`);
          break;
      }
    }
    /**
         * When receiving a {@apilink PeerEvents | `call`} event on a peer, you can call
         * `answer` on the media connection provided by the callback to accept the call
         * and optionally send your own media stream.
    
         *
         * @param stream A WebRTC media stream.
         * @param options
         * @returns
         */
    answer(stream, options = {}) {
      if (this._localStream) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");
        return;
      }
      this._localStream = stream;
      if (options && options.sdpTransform) this.options.sdpTransform = options.sdpTransform;
      this._negotiator.startConnection({
        ...this.options._payload,
        _stream: stream
      });
      const messages = this.provider._getMessages(this.connectionId);
      for (const message of messages) this.handleMessage(message);
      this._open = true;
    }
    /**
    * Exposed functionality for users.
    */
    /**
    * Closes the media connection.
    */
    close() {
      if (this._negotiator) {
        this._negotiator.cleanup();
        this._negotiator = null;
      }
      this._localStream = null;
      this._remoteStream = null;
      if (this.provider) {
        this.provider._removeConnection(this);
        this.provider = null;
      }
      if (this.options && this.options._stream) this.options._stream = null;
      if (!this.open) return;
      this._open = false;
      super.emit("close");
    }
  };
  var $abf266641927cd89$export$2c4e825dc9120f87 = class {
    constructor(_options) {
      this._options = _options;
    }
    _buildRequest(method) {
      const protocol = this._options.secure ? "https" : "http";
      const { host, port, path, key } = this._options;
      const url = new URL(`${protocol}://${host}:${port}${path}${key}/${method}`);
      url.searchParams.set("ts", `${Date.now()}${Math.random()}`);
      url.searchParams.set("version", (0, $520832d44ba058c8$export$83d89fbfd8236492));
      return fetch(url.href, {
        referrerPolicy: this._options.referrerPolicy
      });
    }
    /** Get a unique ID from the server via XHR and initialize with it. */
    async retrieveId() {
      try {
        const response = await this._buildRequest("id");
        if (response.status !== 200) throw new Error(`Error. Status:${response.status}`);
        return response.text();
      } catch (error) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).error("Error retrieving ID", error);
        let pathError = "";
        if (this._options.path === "/" && this._options.host !== (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST) pathError = " If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer.";
        throw new Error("Could not get an ID from the server." + pathError);
      }
    }
    /** @deprecated */
    async listAllPeers() {
      try {
        const response = await this._buildRequest("peers");
        if (response.status !== 200) {
          if (response.status === 401) {
            let helpfulError = "";
            if (this._options.host === (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST) helpfulError = "It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.";
            else helpfulError = "You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.";
            throw new Error("It doesn't look like you have permission to list peers IDs. " + helpfulError);
          }
          throw new Error(`Error. Status:${response.status}`);
        }
        return response.json();
      } catch (error) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).error("Error retrieving list peers", error);
        throw new Error("Could not get list peers from the server." + error);
      }
    }
  };
  var $6366c4ca161bc297$export$d365f7ad9d7df9c9 = class _$6366c4ca161bc297$export$d365f7ad9d7df9c9 extends (0, $5045192fc6d387ba$export$23a2a68283c24d80) {
    static #_ = this.ID_PREFIX = "dc_";
    static #_2 = this.MAX_BUFFERED_AMOUNT = 8388608;
    get type() {
      return (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Data;
    }
    constructor(peerId, provider, options) {
      super(peerId, provider, options);
      this.connectionId = this.options.connectionId || _$6366c4ca161bc297$export$d365f7ad9d7df9c9.ID_PREFIX + (0, $0e5fd1585784c252$export$4e61f672936bec77)();
      this.label = this.options.label || this.connectionId;
      this.reliable = !!this.options.reliable;
      this._negotiator = new (0, $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a)(this);
      this._negotiator.startConnection(this.options._payload || {
        originator: true,
        reliable: this.reliable
      });
    }
    /** Called by the Negotiator when the DataChannel is ready. */
    _initializeDataChannel(dc) {
      this.dataChannel = dc;
      this.dataChannel.onopen = () => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} dc connection success`);
        this._open = true;
        this.emit("open");
      };
      this.dataChannel.onmessage = (e) => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} dc onmessage:`, e.data);
      };
      this.dataChannel.onclose = () => {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} dc closed for:`, this.peer);
        this.close();
      };
    }
    /**
    * Exposed functionality for users.
    */
    /** Allows user to close connection. */
    close(options) {
      if (options?.flush) {
        this.send({
          __peerData: {
            type: "close"
          }
        });
        return;
      }
      if (this._negotiator) {
        this._negotiator.cleanup();
        this._negotiator = null;
      }
      if (this.provider) {
        this.provider._removeConnection(this);
        this.provider = null;
      }
      if (this.dataChannel) {
        this.dataChannel.onopen = null;
        this.dataChannel.onmessage = null;
        this.dataChannel.onclose = null;
        this.dataChannel = null;
      }
      if (!this.open) return;
      this._open = false;
      super.emit("close");
    }
    /** Allows user to send data. */
    send(data, chunked = false) {
      if (!this.open) {
        this.emitError((0, $78455e22dea96b8c$export$49ae800c114df41d).NotOpenYet, "Connection is not open. You should listen for the `open` event before sending messages.");
        return;
      }
      return this._send(data, chunked);
    }
    async handleMessage(message) {
      const payload = message.payload;
      switch (message.type) {
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Answer:
          await this._negotiator.handleSDP(message.type, payload.sdp);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Candidate:
          await this._negotiator.handleCandidate(payload.candidate);
          break;
        default:
          (0, $257947e92926277a$export$2e2bcd8739ae039).warn("Unrecognized message type:", message.type, "from peer:", this.peer);
          break;
      }
    }
  };
  var $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b = class extends (0, $6366c4ca161bc297$export$d365f7ad9d7df9c9) {
    get bufferSize() {
      return this._bufferSize;
    }
    _initializeDataChannel(dc) {
      super._initializeDataChannel(dc);
      this.dataChannel.binaryType = "arraybuffer";
      this.dataChannel.addEventListener("message", (e) => this._handleDataMessage(e));
    }
    _bufferedSend(msg) {
      if (this._buffering || !this._trySend(msg)) {
        this._buffer.push(msg);
        this._bufferSize = this._buffer.length;
      }
    }
    // Returns true if the send succeeds.
    _trySend(msg) {
      if (!this.open) return false;
      if (this.dataChannel.bufferedAmount > (0, $6366c4ca161bc297$export$d365f7ad9d7df9c9).MAX_BUFFERED_AMOUNT) {
        this._buffering = true;
        setTimeout(() => {
          this._buffering = false;
          this._tryBuffer();
        }, 50);
        return false;
      }
      try {
        this.dataChannel.send(msg);
      } catch (e) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).error(`DC#:${this.connectionId} Error when sending:`, e);
        this._buffering = true;
        this.close();
        return false;
      }
      return true;
    }
    // Try to send the first message in the buffer.
    _tryBuffer() {
      if (!this.open) return;
      if (this._buffer.length === 0) return;
      const msg = this._buffer[0];
      if (this._trySend(msg)) {
        this._buffer.shift();
        this._bufferSize = this._buffer.length;
        this._tryBuffer();
      }
    }
    close(options) {
      if (options?.flush) {
        this.send({
          __peerData: {
            type: "close"
          }
        });
        return;
      }
      this._buffer = [];
      this._bufferSize = 0;
      super.close();
    }
    constructor(...args) {
      super(...args), this._buffer = [], this._bufferSize = 0, this._buffering = false;
    }
  };
  var $9fcfddb3ae148f88$export$f0a5a64d5bb37108 = class extends (0, $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b) {
    close(options) {
      super.close(options);
      this._chunkedData = {};
    }
    constructor(peerId, provider, options) {
      super(peerId, provider, options), this.chunker = new (0, $fcbcc7538a6776d5$export$f1c5f4c9cb95390b)(), this.serialization = (0, $78455e22dea96b8c$export$89f507cf986a947).Binary, this._chunkedData = {};
    }
    // Handles a DataChannel message.
    _handleDataMessage({ data }) {
      const deserializedData = (0, $0cfd7828ad59115f$export$417857010dc9287f)(data);
      const peerData = deserializedData["__peerData"];
      if (peerData) {
        if (peerData.type === "close") {
          this.close();
          return;
        }
        this._handleChunk(deserializedData);
        return;
      }
      this.emit("data", deserializedData);
    }
    _handleChunk(data) {
      const id = data.__peerData;
      const chunkInfo = this._chunkedData[id] || {
        data: [],
        count: 0,
        total: data.total
      };
      chunkInfo.data[data.n] = new Uint8Array(data.data);
      chunkInfo.count++;
      this._chunkedData[id] = chunkInfo;
      if (chunkInfo.total === chunkInfo.count) {
        delete this._chunkedData[id];
        const data2 = (0, $fcbcc7538a6776d5$export$52c89ebcdc4f53f2)(chunkInfo.data);
        this._handleDataMessage({
          data: data2
        });
      }
    }
    _send(data, chunked) {
      const blob = (0, $0cfd7828ad59115f$export$2a703dbb0cb35339)(data);
      if (blob instanceof Promise) return this._send_blob(blob);
      if (!chunked && blob.byteLength > this.chunker.chunkedMTU) {
        this._sendChunks(blob);
        return;
      }
      this._bufferedSend(blob);
    }
    async _send_blob(blobPromise) {
      const blob = await blobPromise;
      if (blob.byteLength > this.chunker.chunkedMTU) {
        this._sendChunks(blob);
        return;
      }
      this._bufferedSend(blob);
    }
    _sendChunks(blob) {
      const blobs = this.chunker.chunk(blob);
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`DC#${this.connectionId} Try to send ${blobs.length} chunks...`);
      for (const blob2 of blobs) this.send(blob2, true);
    }
  };
  var $bbaee3f15f714663$export$6f88fe47d32c9c94 = class extends (0, $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b) {
    _handleDataMessage({ data }) {
      super.emit("data", data);
    }
    _send(data, _chunked) {
      this._bufferedSend(data);
    }
    constructor(...args) {
      super(...args), this.serialization = (0, $78455e22dea96b8c$export$89f507cf986a947).None;
    }
  };
  var $817f931e3f9096cf$export$48880ac635f47186 = class extends (0, $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b) {
    // Handles a DataChannel message.
    _handleDataMessage({ data }) {
      const deserializedData = this.parse(this.decoder.decode(data));
      const peerData = deserializedData["__peerData"];
      if (peerData && peerData.type === "close") {
        this.close();
        return;
      }
      this.emit("data", deserializedData);
    }
    _send(data, _chunked) {
      const encodedData = this.encoder.encode(this.stringify(data));
      if (encodedData.byteLength >= (0, $4f4134156c446392$export$7debb50ef11d5e0b).chunkedMTU) {
        this.emitError((0, $78455e22dea96b8c$export$49ae800c114df41d).MessageToBig, "Message too big for JSON channel");
        return;
      }
      this._bufferedSend(encodedData);
    }
    constructor(...args) {
      super(...args), this.serialization = (0, $78455e22dea96b8c$export$89f507cf986a947).JSON, this.encoder = new TextEncoder(), this.decoder = new TextDecoder(), this.stringify = JSON.stringify, this.parse = JSON.parse;
    }
  };
  var $416260bce337df90$export$ecd1fc136c422448 = class _$416260bce337df90$export$ecd1fc136c422448 extends (0, $23779d1881157a18$export$6a678e589c8a4542) {
    static #_ = this.DEFAULT_KEY = "peerjs";
    /**
    * The brokering ID of this peer
    *
    * If no ID was specified in {@apilink Peer | the constructor},
    * this will be `undefined` until the {@apilink PeerEvents | `open`} event is emitted.
    */
    get id() {
      return this._id;
    }
    get options() {
      return this._options;
    }
    get open() {
      return this._open;
    }
    /**
    * @internal
    */
    get socket() {
      return this._socket;
    }
    /**
    * A hash of all connections associated with this peer, keyed by the remote peer's ID.
    * @deprecated
    * Return type will change from Object to Map<string,[]>
    */
    get connections() {
      const plainConnections = /* @__PURE__ */ Object.create(null);
      for (const [k, v] of this._connections) plainConnections[k] = v;
      return plainConnections;
    }
    /**
    * true if this peer and all of its connections can no longer be used.
    */
    get destroyed() {
      return this._destroyed;
    }
    /**
    * false if there is an active connection to the PeerServer.
    */
    get disconnected() {
      return this._disconnected;
    }
    constructor(id, options) {
      super(), this._serializers = {
        raw: (0, $bbaee3f15f714663$export$6f88fe47d32c9c94),
        json: (0, $817f931e3f9096cf$export$48880ac635f47186),
        binary: (0, $9fcfddb3ae148f88$export$f0a5a64d5bb37108),
        "binary-utf8": (0, $9fcfddb3ae148f88$export$f0a5a64d5bb37108),
        default: (0, $9fcfddb3ae148f88$export$f0a5a64d5bb37108)
      }, this._id = null, this._lastServerId = null, // States.
      this._destroyed = false, this._disconnected = false, this._open = false, this._connections = /* @__PURE__ */ new Map(), this._lostMessages = /* @__PURE__ */ new Map();
      let userId;
      if (id && id.constructor == Object) options = id;
      else if (id) userId = id.toString();
      options = {
        debug: 0,
        host: (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST,
        port: (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_PORT,
        path: "/",
        key: _$416260bce337df90$export$ecd1fc136c422448.DEFAULT_KEY,
        token: (0, $4f4134156c446392$export$7debb50ef11d5e0b).randomToken(),
        config: (0, $4f4134156c446392$export$7debb50ef11d5e0b).defaultConfig,
        referrerPolicy: "strict-origin-when-cross-origin",
        serializers: {},
        ...options
      };
      this._options = options;
      this._serializers = {
        ...this._serializers,
        ...this.options.serializers
      };
      if (this._options.host === "/") this._options.host = window.location.hostname;
      if (this._options.path) {
        if (this._options.path[0] !== "/") this._options.path = "/" + this._options.path;
        if (this._options.path[this._options.path.length - 1] !== "/") this._options.path += "/";
      }
      if (this._options.secure === void 0 && this._options.host !== (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST) this._options.secure = (0, $4f4134156c446392$export$7debb50ef11d5e0b).isSecure();
      else if (this._options.host == (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST) this._options.secure = true;
      if (this._options.logFunction) (0, $257947e92926277a$export$2e2bcd8739ae039).setLogFunction(this._options.logFunction);
      (0, $257947e92926277a$export$2e2bcd8739ae039).logLevel = this._options.debug || 0;
      this._api = new (0, $abf266641927cd89$export$2c4e825dc9120f87)(options);
      this._socket = this._createServerConnection();
      if (!(0, $4f4134156c446392$export$7debb50ef11d5e0b).supports.audioVideo && !(0, $4f4134156c446392$export$7debb50ef11d5e0b).supports.data) {
        this._delayedAbort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).BrowserIncompatible, "The current browser does not support WebRTC");
        return;
      }
      if (!!userId && !(0, $4f4134156c446392$export$7debb50ef11d5e0b).validateId(userId)) {
        this._delayedAbort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).InvalidID, `ID "${userId}" is invalid`);
        return;
      }
      if (userId) this._initialize(userId);
      else this._api.retrieveId().then((id2) => this._initialize(id2)).catch((error) => this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).ServerError, error));
    }
    _createServerConnection() {
      const socket = new (0, $8f5bfa60836d261d$export$4798917dbf149b79)(this._options.secure, this._options.host, this._options.port, this._options.path, this._options.key, this._options.pingInterval);
      socket.on((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Message, (data) => {
        this._handleMessage(data);
      });
      socket.on((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Error, (error) => {
        this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).SocketError, error);
      });
      socket.on((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Disconnected, () => {
        if (this.disconnected) return;
        this.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).Network, "Lost connection to server.");
        this.disconnect();
      });
      socket.on((0, $78455e22dea96b8c$export$3b5c4a4b6354f023).Close, () => {
        if (this.disconnected) return;
        this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).SocketClosed, "Underlying socket is already closed.");
      });
      return socket;
    }
    /** Initialize a connection with the server. */
    _initialize(id) {
      this._id = id;
      this.socket.start(id, this._options.token);
    }
    /** Handles messages from the server. */
    _handleMessage(message) {
      const type = message.type;
      const payload = message.payload;
      const peerId = message.src;
      switch (type) {
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Open:
          this._lastServerId = this.id;
          this._open = true;
          this.emit("open", this.id);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Error:
          this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).ServerError, payload.msg);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).IdTaken:
          this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).UnavailableID, `ID "${this.id}" is taken`);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).InvalidKey:
          this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).InvalidKey, `API KEY "${this._options.key}" is invalid`);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Leave:
          (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Received leave message from ${peerId}`);
          this._cleanupPeer(peerId);
          this._connections.delete(peerId);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Expire:
          this.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).PeerUnavailable, `Could not connect to peer ${peerId}`);
          break;
        case (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Offer: {
          const connectionId = payload.connectionId;
          let connection = this.getConnection(peerId, connectionId);
          if (connection) {
            connection.close();
            (0, $257947e92926277a$export$2e2bcd8739ae039).warn(`Offer received for existing Connection ID:${connectionId}`);
          }
          if (payload.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Media) {
            const mediaConnection = new (0, $5c1d08c7c57da9a3$export$4a84e95a2324ac29)(peerId, this, {
              connectionId,
              _payload: payload,
              metadata: payload.metadata
            });
            connection = mediaConnection;
            this._addConnection(peerId, connection);
            this.emit("call", mediaConnection);
          } else if (payload.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Data) {
            const dataConnection = new this._serializers[payload.serialization](peerId, this, {
              connectionId,
              _payload: payload,
              metadata: payload.metadata,
              label: payload.label,
              serialization: payload.serialization,
              reliable: payload.reliable
            });
            connection = dataConnection;
            this._addConnection(peerId, connection);
            this.emit("connection", dataConnection);
          } else {
            (0, $257947e92926277a$export$2e2bcd8739ae039).warn(`Received malformed connection type:${payload.type}`);
            return;
          }
          const messages = this._getMessages(connectionId);
          for (const message2 of messages) connection.handleMessage(message2);
          break;
        }
        default: {
          if (!payload) {
            (0, $257947e92926277a$export$2e2bcd8739ae039).warn(`You received a malformed message from ${peerId} of type ${type}`);
            return;
          }
          const connectionId = payload.connectionId;
          const connection = this.getConnection(peerId, connectionId);
          if (connection && connection.peerConnection)
            connection.handleMessage(message);
          else if (connectionId)
            this._storeMessage(connectionId, message);
          else (0, $257947e92926277a$export$2e2bcd8739ae039).warn("You received an unrecognized message:", message);
          break;
        }
      }
    }
    /** Stores messages without a set up connection, to be claimed later. */
    _storeMessage(connectionId, message) {
      if (!this._lostMessages.has(connectionId)) this._lostMessages.set(connectionId, []);
      this._lostMessages.get(connectionId).push(message);
    }
    /**
    * Retrieve messages from lost message store
    * @internal
    */
    //TODO Change it to private
    _getMessages(connectionId) {
      const messages = this._lostMessages.get(connectionId);
      if (messages) {
        this._lostMessages.delete(connectionId);
        return messages;
      }
      return [];
    }
    /**
    * Connects to the remote peer specified by id and returns a data connection.
    * @param peer The brokering ID of the remote peer (their {@apilink Peer.id}).
    * @param options for specifying details about Peer Connection
    */
    connect(peer, options = {}) {
      options = {
        serialization: "default",
        ...options
      };
      if (this.disconnected) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available.");
        this.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).Disconnected, "Cannot connect to new Peer after disconnecting from server.");
        return;
      }
      const dataConnection = new this._serializers[options.serialization](peer, this, options);
      this._addConnection(peer, dataConnection);
      return dataConnection;
    }
    /**
    * Calls the remote peer specified by id and returns a media connection.
    * @param peer The brokering ID of the remote peer (their peer.id).
    * @param stream The caller's media stream
    * @param options Metadata associated with the connection, passed in by whoever initiated the connection.
    */
    call(peer, stream, options = {}) {
      if (this.disconnected) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect.");
        this.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).Disconnected, "Cannot connect to new Peer after disconnecting from server.");
        return;
      }
      if (!stream) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");
        return;
      }
      const mediaConnection = new (0, $5c1d08c7c57da9a3$export$4a84e95a2324ac29)(peer, this, {
        ...options,
        _stream: stream
      });
      this._addConnection(peer, mediaConnection);
      return mediaConnection;
    }
    /** Add a data/media connection to this peer. */
    _addConnection(peerId, connection) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`add connection ${connection.type}:${connection.connectionId} to peerId:${peerId}`);
      if (!this._connections.has(peerId)) this._connections.set(peerId, []);
      this._connections.get(peerId).push(connection);
    }
    //TODO should be private
    _removeConnection(connection) {
      const connections = this._connections.get(connection.peer);
      if (connections) {
        const index = connections.indexOf(connection);
        if (index !== -1) connections.splice(index, 1);
      }
      this._lostMessages.delete(connection.connectionId);
    }
    /** Retrieve a data/media connection for this peer. */
    getConnection(peerId, connectionId) {
      const connections = this._connections.get(peerId);
      if (!connections) return null;
      for (const connection of connections) {
        if (connection.connectionId === connectionId) return connection;
      }
      return null;
    }
    _delayedAbort(type, message) {
      setTimeout(() => {
        this._abort(type, message);
      }, 0);
    }
    /**
    * Emits an error message and destroys the Peer.
    * The Peer is not destroyed if it's in a disconnected state, in which case
    * it retains its disconnected state and its existing connections.
    */
    _abort(type, message) {
      (0, $257947e92926277a$export$2e2bcd8739ae039).error("Aborting!");
      this.emitError(type, message);
      if (!this._lastServerId) this.destroy();
      else this.disconnect();
    }
    /**
    * Destroys the Peer: closes all active connections as well as the connection
    * to the server.
    *
    * :::caution
    * This cannot be undone; the respective peer object will no longer be able
    * to create or receive any connections, its ID will be forfeited on the server,
    * and all of its data and media connections will be closed.
    * :::
    */
    destroy() {
      if (this.destroyed) return;
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Destroy peer with ID:${this.id}`);
      this.disconnect();
      this._cleanup();
      this._destroyed = true;
      this.emit("close");
    }
    /** Disconnects every connection on this peer. */
    _cleanup() {
      for (const peerId of this._connections.keys()) {
        this._cleanupPeer(peerId);
        this._connections.delete(peerId);
      }
      this.socket.removeAllListeners();
    }
    /** Closes all connections to this peer. */
    _cleanupPeer(peerId) {
      const connections = this._connections.get(peerId);
      if (!connections) return;
      for (const connection of connections) connection.close();
    }
    /**
    * Disconnects the Peer's connection to the PeerServer. Does not close any
    *  active connections.
    * Warning: The peer can no longer create or accept connections after being
    *  disconnected. It also cannot reconnect to the server.
    */
    disconnect() {
      if (this.disconnected) return;
      const currentId = this.id;
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Disconnect peer with ID:${currentId}`);
      this._disconnected = true;
      this._open = false;
      this.socket.close();
      this._lastServerId = currentId;
      this._id = null;
      this.emit("disconnected", currentId);
    }
    /** Attempts to reconnect with the same ID.
    *
    * Only {@apilink Peer.disconnect | disconnected peers} can be reconnected.
    * Destroyed peers cannot be reconnected.
    * If the connection fails (as an example, if the peer's old ID is now taken),
    * the peer's existing connections will not close, but any associated errors events will fire.
    */
    reconnect() {
      if (this.disconnected && !this.destroyed) {
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Attempting reconnection to server with ID ${this._lastServerId}`);
        this._disconnected = false;
        this._initialize(this._lastServerId);
      } else if (this.destroyed) throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");
      else if (!this.disconnected && !this.open)
        (0, $257947e92926277a$export$2e2bcd8739ae039).error("In a hurry? We're still trying to make the initial connection!");
      else throw new Error(`Peer ${this.id} cannot reconnect because it is not disconnected from the server!`);
    }
    /**
    * Get a list of available peer IDs. If you're running your own server, you'll
    * want to set allow_discovery: true in the PeerServer options. If you're using
    * the cloud server, email team@peerjs.com to get the functionality enabled for
    * your key.
    */
    listAllPeers(cb = (_) => {
    }) {
      this._api.listAllPeers().then((peers) => cb(peers)).catch((error) => this._abort((0, $78455e22dea96b8c$export$9547aaa2e39030ff).ServerError, error));
    }
  };

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
      const PeerClass = typeof window !== "undefined" && window.Peer ? window.Peer : $416260bce337df90$export$ecd1fc136c422448;
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
    async savePlayerData(key, data) {
      if (!this.matrix.isAuthenticated) {
        throw new Error("Matrix client is not authenticated to save player data");
      }
      const type = `org.nomnipeer.player.${key}`;
      const payload = {
        ...typeof data === "object" && data !== null ? data : { value: data },
        _updatedAt: Date.now()
      };
      await this.matrix.setAccountData(type, payload);
    }
    async loadPlayerData(key) {
      if (!this.matrix.isAuthenticated) {
        return null;
      }
      const type = `org.nomnipeer.player.${key}`;
      return await this.matrix.getAccountData(type);
    }
  };

  // src/providers/nostr/crypto.ts
  var P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
  var N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
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
  async function taggedHash(tag, msg) {
    const tagBytes = new TextEncoder().encode(tag);
    const tagHash = await sha256Bytes(tagBytes);
    const concat = new Uint8Array(tagHash.length * 2 + msg.length);
    concat.set(tagHash, 0);
    concat.set(tagHash, tagHash.length);
    concat.set(msg, tagHash.length * 2);
    return sha256Bytes(concat);
  }
  function xorBytes(a, b) {
    const out = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
    return out;
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
  async function schnorrSign(msgHashHex, secretKeyHex, auxRandHex) {
    const d0 = BigInt("0x" + secretKeyHex);
    if (d0 <= 0n || d0 >= N) throw new Error("Invalid secret key");
    const P0 = pointMultiply(d0, G);
    const d = P0.y % 2n === 0n ? d0 : N - d0;
    const dBytes = hexToBytes(toHex32(d));
    const pxBytes = hexToBytes(toHex32(P0.x));
    const msgBytes = hexToBytes(msgHashHex);
    let aBytes;
    if (auxRandHex) {
      aBytes = hexToBytes(auxRandHex);
    } else {
      aBytes = new Uint8Array(32);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(aBytes);
      }
    }
    const tAux = await taggedHash("BIP0340/aux", aBytes);
    const t = xorBytes(dBytes, tAux);
    const nonceInput = new Uint8Array(t.length + pxBytes.length + msgBytes.length);
    nonceInput.set(t, 0);
    nonceInput.set(pxBytes, t.length);
    nonceInput.set(msgBytes, t.length + pxBytes.length);
    const randHash = await taggedHash("BIP0340/nonce", nonceInput);
    let k0 = BigInt("0x" + bytesToHex(randHash)) % N;
    if (k0 === 0n) throw new Error("k0 is zero");
    const R = pointMultiply(k0, G);
    const k = R.y % 2n === 0n ? k0 : N - k0;
    const rxBytes = hexToBytes(toHex32(R.x));
    const challengeInput = new Uint8Array(rxBytes.length + pxBytes.length + msgBytes.length);
    challengeInput.set(rxBytes, 0);
    challengeInput.set(pxBytes, rxBytes.length);
    challengeInput.set(msgBytes, rxBytes.length + pxBytes.length);
    const eHash = await taggedHash("BIP0340/challenge", challengeInput);
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
    "wss://nos.lol",
    "wss://relay.damus.io",
    "wss://nostr.mom"
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
      const connectPromises = [];
      for (const url of this.relayUrls) {
        if (this.sockets.has(url)) continue;
        try {
          const ws = new WebSocket(url);
          const p = new Promise((resolve) => {
            const timeout = setTimeout(resolve, 2500);
            ws.onopen = () => {
              clearTimeout(timeout);
              resolve();
            };
            ws.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
          connectPromises.push(p);
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
      if (connectPromises.length > 0) {
        await Promise.race([
          Promise.all(connectPromises),
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
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
        kinds: [30078, 20001, 20002, 20003],
        "#d": [this.roomId],
        since: Math.floor(Date.now() / 1e3) - 300
      });
      if (this.isHost) {
        this.broadcastLobbyHeartbeat();
        this.heartbeatTimer = setInterval(() => {
          this.broadcastLobbyHeartbeat();
        }, 7e3);
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
      this.publishEvent(30078, [["d", this.roomId], ["t", "mpg-lobby"], ["g", this.gameId]], {
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
        if (event.kind === 30078 || event.kind === 20001) {
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
              if (this.isHost) {
                this.broadcastLobbyHeartbeat();
                const hostSelf = this._players.get(this.keyPair.publicKey);
                if (hostSelf) {
                  this.publishEvent(20002, [["d", this.roomId]], {
                    type: "player_update",
                    player: hostSelf
                  });
                }
              }
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
      if (this.isHost) {
        try {
          await this.publishEvent(30078, [["d", this.roomId], ["t", "mpg-lobby"], ["g", this.gameId]], {
            status: "closed",
            numPlayers: 0,
            gameId: this.gameId
          });
        } catch {
        }
      }
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
      await this.pool.connect();
      return new Promise((resolve) => {
        const subId = "list_" + Math.random().toString(36).substring(2, 9);
        const lobbiesMap = /* @__PURE__ */ new Map();
        const unsubscribe = this.pool.onMessage((event) => {
          if (event.kind !== 30078 && event.kind !== 20001) return;
          const dTag = event.tags.find((t) => t[0] === "d")?.[1];
          if (!dTag) return;
          try {
            const data = JSON.parse(event.content);
            if (data.gameId !== gameId) return;
            if (data.status === "closed") {
              lobbiesMap.delete(dTag);
              return;
            }
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
        let finishTimer = null;
        const finish = () => {
          if (finishTimer) clearTimeout(finishTimer);
          unsubscribe();
          this.pool.unsubscribe(subId);
          resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
        };
        this.pool.subscribe(
          subId,
          {
            kinds: [30078, 20001],
            "#t": ["mpg-lobby"],
            "#g": [gameId],
            since: Math.floor(Date.now() / 1e3) - 7200
          },
          () => {
            if (!finishTimer) {
              finishTimer = setTimeout(finish, 400);
            }
          }
        );
        finishTimer = setTimeout(() => {
          finish();
        }, 2500);
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
    async createSignedEvent(kind, tags, contentObj) {
      const content = typeof contentObj === "string" ? contentObj : JSON.stringify(contentObj);
      const createdAt = Math.floor(Date.now() / 1e3);
      const serialized = JSON.stringify([0, this.keyPair.publicKey, createdAt, kind, tags, content]);
      const id = await sha256Hex(serialized);
      const sig = await schnorrSign(id, this.keyPair.secretKey);
      return {
        id,
        pubkey: this.keyPair.publicKey,
        created_at: createdAt,
        kind,
        tags,
        content,
        sig
      };
    }
    async savePlayerData(key, data) {
      const dTag = `nomnipeer:player:${key}`;
      const payload = {
        ...typeof data === "object" && data !== null ? data : { value: data },
        _updatedAt: Date.now()
      };
      const event = await this.createSignedEvent(
        30078,
        [
          ["d", dTag],
          ["t", "nomnipeer-player-data"]
        ],
        payload
      );
      this.pool.send(["EVENT", event]);
    }
    async loadPlayerData(key) {
      const dTag = `nomnipeer:player:${key}`;
      const subId = "pdata_" + Math.random().toString(36).substring(2, 9);
      return new Promise((resolve) => {
        let result = null;
        let latestCreatedAt = 0;
        let finishTimer = null;
        const finish = () => {
          if (finishTimer) clearTimeout(finishTimer);
          unsubscribe();
          this.pool.unsubscribe(subId);
          resolve(result);
        };
        const unsubscribe = this.pool.onMessage((event) => {
          if (event.kind === 30078 && event.pubkey === this.keyPair.publicKey) {
            const hasDTag = event.tags?.some((t) => t[0] === "d" && t[1] === dTag);
            if (hasDTag && event.created_at >= latestCreatedAt) {
              try {
                result = JSON.parse(event.content);
                latestCreatedAt = event.created_at;
              } catch {
              }
            }
          }
        });
        this.pool.subscribe(
          subId,
          {
            kinds: [30078],
            authors: [this.keyPair.publicKey],
            "#d": [dTag],
            limit: 1
          },
          () => {
            if (!finishTimer) {
              finishTimer = setTimeout(finish, 350);
            }
          }
        );
        finishTimer = setTimeout(() => {
          finish();
        }, 2500);
      });
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
    publish(topic, message, retain = false) {
      const topicBytes = new TextEncoder().encode(topic);
      const topicLen = [topicBytes.length >> 8, topicBytes.length & 255];
      const msgBytes = new TextEncoder().encode(message);
      const varPayload = [...topicLen, ...topicBytes, ...msgBytes];
      const lenBytes = this.encodeLength(varPayload.length);
      const headerByte = retain ? 49 : 48;
      const packet = new Uint8Array([headerByte, ...lenBytes, ...varPayload]);
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
      if (this.isHost) {
        this.mqtt.subscribe(`mpg/${this.gameId}/lobbies/ping`);
      }
      this.unsubscribeMessages = this.mqtt.onMessage((topic, payload) => {
        if (this.isHost && topic === `mpg/${this.gameId}/lobbies/ping`) {
          this.broadcastLobbyHeartbeat();
          return;
        }
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
      this.mqtt.publish(this.lobbyTopic, JSON.stringify(info), true);
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
      if (this.isHost) {
        this.mqtt.publish(this.lobbyTopic, JSON.stringify({ roomId: this.roomId, status: "closed", numPlayers: 0 }), true);
      }
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
      if (!this._isConnected) await this.connect();
      return new Promise((resolve) => {
        const discoveryTopic = `mpg/${gameId}/lobbies/+`;
        this.mqtt.subscribe(discoveryTopic);
        const lobbiesMap = /* @__PURE__ */ new Map();
        const unsubscribe = this.mqtt.onMessage((topic, payload) => {
          if (!topicMatches(discoveryTopic, topic)) return;
          try {
            const info = JSON.parse(payload);
            if (info.status === "closed") {
              lobbiesMap.delete(info.roomId);
              return;
            }
            lobbiesMap.set(info.roomId, { info, receivedAt: Date.now() });
          } catch {
          }
        });
        this.mqtt.publish(`mpg/${gameId}/lobbies/ping`, "ping");
        setTimeout(() => {
          unsubscribe();
          resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
        }, 1500);
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
    async savePlayerData(key, data) {
      const payload = {
        ...typeof data === "object" && data !== null ? data : { value: data },
        _updatedAt: Date.now()
      };
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(`mpg_player_${key}`, JSON.stringify(payload));
        } catch {
        }
      }
    }
    async loadPlayerData(key) {
      if (typeof localStorage !== "undefined") {
        try {
          const raw = localStorage.getItem(`mpg_player_${key}`);
          if (raw) return JSON.parse(raw);
        } catch {
        }
      }
      return null;
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
    setUserId(userId) {
      if (userId) this.myUserId = userId;
    }
    async savePlayerData(key, data) {
      const url = `${this.cleanDbUrl()}/users/${encodeURIComponent(this.myUserId)}/${encodeURIComponent(key)}.json`;
      const payload = {
        ...typeof data === "object" && data !== null ? data : { value: data },
        _updatedAt: Date.now()
      };
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Firebase savePlayerData failed: ${res.statusText}`);
      }
    }
    async loadPlayerData(key) {
      const url = `${this.cleanDbUrl()}/users/${encodeURIComponent(this.myUserId)}/${encodeURIComponent(key)}.json`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data;
      } catch {
        return null;
      }
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
    /**
     * Save player data / stats / savegame in the cloud or local storage
     * Supported across Firebase (RTDB), Matrix (Account Data), Nostr (NIP-78), and LocalStorage
     */
    async savePlayerData(key, data) {
      if (this.lobbyProvider && typeof this.lobbyProvider.savePlayerData === "function") {
        try {
          await this.lobbyProvider.savePlayerData(key, data);
          return;
        } catch (err) {
        }
      }
      if (typeof localStorage !== "undefined") {
        const payload = {
          ...typeof data === "object" && data !== null ? data : { value: data },
          _updatedAt: Date.now()
        };
        try {
          localStorage.setItem(`mpg_player_${this.gameId}_${key}`, JSON.stringify(payload));
        } catch {
        }
      }
    }
    /**
     * Load player data / stats / savegame from the cloud or local storage
     */
    async loadPlayerData(key) {
      if (this.lobbyProvider && typeof this.lobbyProvider.loadPlayerData === "function") {
        try {
          const remoteData = await this.lobbyProvider.loadPlayerData(key);
          if (remoteData !== null && remoteData !== void 0) {
            return remoteData;
          }
        } catch {
        }
      }
      if (typeof localStorage !== "undefined") {
        try {
          const raw = localStorage.getItem(`mpg_player_${this.gameId}_${key}`);
          if (raw) return JSON.parse(raw);
        } catch {
        }
      }
      return null;
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
  var src_default = nOmniPeer;
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=nomnipeer.js.map