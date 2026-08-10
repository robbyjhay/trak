/** Messages sent by the client to the server */
export type OutgoingMessage =
  | { type: "register"; userId: string }
  | { type: "call_offer"; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "call_answer"; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice_candidate"; to: string; candidate: RTCIceCandidateInit }
  | { type: "call_accept"; to: string }
  | { type: "call_reject"; to: string }
  | { type: "call_end"; to: string }
  | { type: "ping" };

/** Messages received by the client from the server */
export type IncomingMessage =
  | { type: "online_users"; users: string[] }
  | { type: "user_online"; userId: string }
  | { type: "user_offline"; userId: string }
  | { type: "call_offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "call_answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice_candidate"; from: string; candidate: RTCIceCandidateInit }
  | { type: "call_accept"; from: string }
  | { type: "call_reject"; from: string }
  | { type: "call_end"; from: string }
  | { type: "peer_busy"; from: string }
  | { type: "peer_unavailable"; from: string };
