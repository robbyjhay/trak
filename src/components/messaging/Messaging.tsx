"use client";

import { useEffect, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { useConnectNav } from "@/context/ConnectNav";
import {
  canBroadcast,
  canManageTeamProfiles,
  canWipeCommunity,
  roleLabel,
} from "@/lib/permissions";
import { cn, firstName, formatDuration, initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { NewConversation } from "@/components/messaging/NewConversation";
import { AddMember } from "@/components/messaging/AddMember";
import { CallPanel } from "@/components/call/CallPanel";
import { useCall } from "@/context/CallContext";
import type { CallRecord, Dm, TrakDb } from "@/lib/types";

type ThreadItem =
  | { kind: "dm"; id: string; dm: Dm }
  | { kind: "call"; id: string; call: CallRecord };

/** uid() ids share a counter, so the numeric suffix is a global ordering key. */
function sortByUid(id: string): number {
  const m = id.match(/_(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function threadItems(db: TrakDb, me: string, other: string): ThreadItem[] {
  return [
    ...db.dms
      .filter(
        (d) =>
          (d.a === me && d.b === other) || (d.a === other && d.b === me),
      )
      .map((dm) => ({ kind: "dm" as const, id: dm.id, dm })),
    ...db.calls
      .filter(
        (c) =>
          (c.a === me && c.b === other) || (c.a === other && c.b === me),
      )
      .map((call) => ({ kind: "call" as const, id: call.id, call })),
  ].sort((x, y) => sortByUid(x.id) - sortByUid(y.id));
}

export function Messaging({
  initialView,
}: {
  initialView: "messages" | "contacts";
}) {
  const {
    sessionUser,
    users,
    userMap,
    db,
    sendDm,
    sendCommunity,
    wipeCommunity,
    sendBroadcast,
    showToast,
  } = useTrak();
  const { view, setView } = useConnectNav();
  const { activeCall, elapsedSec, startCall } = useCall();
  const me = sessionUser.id;
  const [activeConv, setActiveConv] = useState<string>("community");
  const [mobilePane, setMobilePane] = useState<"list" | "thread">("list");
  const [input, setInput] = useState("");
  const [bcText, setBcText] = useState("");
  const [wipeOpen, setWipeOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvKey, setNewConvKey] = useState(0);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  useEffect(() => {
    setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canBc = canBroadcast(sessionUser);
  const canWipe = canWipeCommunity(sessionUser);

  function dmPartners() {
    const s = new Set<string>();
    db.dms.forEach((d) => {
      if (d.a === me) s.add(d.b);
      if (d.b === me) s.add(d.a);
    });
    users.forEach((u) => {
      if (u.id !== me) s.add(u.id);
    });
    return [...s];
  }

  function openThread(pid: string) {
    setActiveConv(pid);
    setMobilePane("thread");
    setNewConvOpen(false);
  }

  return (
    <div className="h-full">
      {view === "messages" ? (
        <div className="flex h-full overflow-hidden rounded-[20px] border border-line bg-card">
          {/* Conv list */}
          <div
            className={cn(
              "relative w-full shrink-0 flex-col border-r border-line md:flex md:w-[300px]",
              mobilePane === "thread" ? "hidden" : "flex",
            )}
          >
            <div className="border-b border-line p-4">
              <input
                type="search"
                placeholder="Search conversations…"
                className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5 text-[13px]"
                aria-label="Search conversations"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
              <ConvItem
                active={activeConv === "community"}
                onClick={() => {
                  setActiveConv("community");
                  setMobilePane("thread");
                }}
                avatar={
                  <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-aztec-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d={PATHS.users} />
                    </svg>
                  </div>
                }
                name="Community Chat"
                snippet={
                  db.community[db.community.length - 1]?.text ||
                  "No messages yet"
                }
              />
              {canBc && (
                <ConvItem
                  active={activeConv === "broadcast"}
                  onClick={() => {
                    setActiveConv("broadcast");
                    setMobilePane("thread");
                  }}
                  avatar={
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-saffron to-[#d9a72c] text-aztec">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={PATHS.send} />
                      </svg>
                    </div>
                  }
                  name="Broadcast"
                  snippet="Send an announcement to all"
                />
              )}
              <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">
                Direct Messages
              </div>
              {dmPartners().map((pid) => {
                const p = userMap[pid];
                if (!p) return null;
                const items = threadItems(db, me, pid);
                const last = items[items.length - 1];
                const onCall = activeCall?.partnerId === pid;
                const snippet = onCall
                  ? activeCall.status === "ringing"
                    ? "Ringing…"
                    : `On call · ${formatDuration(elapsedSec)}`
                  : last
                    ? last.kind === "call"
                      ? `${last.call.from === me ? "You called" : "Incoming call"} · ${formatDuration(last.call.durationSec)}`
                      : last.dm.text
                    : "Say hello 👋";
                return (
                  <ConvItem
                    key={pid}
                    active={activeConv === pid}
                    onClick={() => openThread(pid)}
                    avatar={
                      <div
                        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white"
                        style={{ background: p.color }}
                      >
                        {initials(p.name)}
                      </div>
                    }
                    name={p.name}
                    snippet={snippet}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setNewConvKey((k) => k + 1);
                setNewConvOpen(true);
              }}
              className="absolute right-4 bottom-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-wa text-white shadow-toast transition-transform hover:scale-105"
              aria-label="New conversation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                <path d={PATHS.plus} />
              </svg>
            </button>
          </div>

          {/* Thread */}
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col",
              mobilePane === "list" ? "hidden md:flex" : "flex",
            )}
          >
            {activeConv === "community" && (
              <>
                <div className="flex items-center gap-3 border-b border-line px-[22px] py-3.5">
                  <BackBtn onClick={() => setMobilePane("list")} />
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-aztec-3">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d={PATHS.users} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold">Community Chat</div>
                    <div className="truncate text-[11px] text-ink-faint">
                      Visible to all {users.length} unit members
                    </div>
                  </div>
                  {canWipe && (
                    <button
                      type="button"
                      className="ml-auto flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-[#f2cfcb] bg-surface text-critical"
                      onClick={() => setWipeOpen((v) => !v)}
                      aria-label="Wipe community chat"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={PATHS.trash} />
                      </svg>
                    </button>
                  )}
                </div>
                {canWipe && wipeOpen && (
                  <div className="flex items-center gap-3 border-b border-[#f2cfcb] bg-critical-bg px-[22px] py-3.5">
                    <label className="text-[11px] font-bold text-critical uppercase">
                      Wipe all community messages
                    </label>
                    <button
                      type="button"
                      className="ml-auto cursor-pointer rounded-lg border-none bg-critical px-3.5 py-2 text-xs font-bold text-white"
                      onClick={() => {
                        void wipeCommunity()
                          .then(() => {
                            setWipeOpen(false);
                            showToast(
                              "Community chat wiped",
                              "All messages were removed for everyone.",
                            );
                          })
                          .catch(() =>
                            showToast(
                              "Could not wipe chat",
                              "Please try again.",
                            ),
                          );
                      }}
                    >
                      Wipe
                    </button>
                  </div>
                )}
                <ThreadScroll>
                  {db.community.length
                    ? db.community.map((m) => (
                        <Bubble
                          key={m.id}
                          fromId={m.from}
                          text={m.text}
                          time={m.at}
                          me={me}
                          userMap={userMap}
                        />
                      ))
                    : (
                      <div className="py-8 text-center text-[13px] text-ink-faint">
                        No messages yet.
                      </div>
                    )}
                </ThreadScroll>
                <Composer
                  value={input}
                  onChange={setInput}
                  placeholder="Message the whole unit…"
                  onSend={() => {
                    if (!input.trim()) return;
                    const text = input.trim();
                    setInput("");
                    void sendCommunity(text).catch(() =>
                      showToast("Could not send message", "Please try again."),
                    );
                  }}
                />
              </>
            )}

            {activeConv === "broadcast" && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-line px-[22px] py-3.5 md:hidden">
                  <BackBtn onClick={() => setMobilePane("list")} />
                  <div className="text-[13.5px] font-bold">Broadcast</div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-10">
                <div className="mb-[18px] flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-saffron to-[#d9a72c] text-aztec">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.send} />
                  </svg>
                </div>
                <h3 className="m-0 mb-1.5 font-display text-xl">
                  Broadcast to the unit
                </h3>
                <p className="mb-[22px] max-w-[380px] text-[13px] text-ink-soft">
                  Only the Unit Head and the Secretary can send this. It reaches all{" "}
                  {users.length} members at once.
                </p>
                <textarea
                  value={bcText}
                  onChange={(e) => setBcText(e.target.value)}
                  placeholder="Write your announcement…"
                  className="mb-3.5 min-h-[100px] w-full max-w-[440px] rounded-[14px] border-[1.5px] border-line px-4 py-3.5"
                />
                <PrimaryBtn
                  onClick={() => {
                    if (!bcText.trim()) return;
                    const text = bcText.trim();
                    void sendBroadcast(text)
                      .then(() => {
                        setBcText("");
                        showToast(
                          "Broadcast sent",
                          `Delivered to all ${users.length} unit members.`,
                        );
                      })
                      .catch(() =>
                        showToast(
                          "Could not send broadcast",
                          "Please try again.",
                        ),
                      );
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.send} />
                  </svg>
                  Send to all {users.length} members
                </PrimaryBtn>
                </div>
              </div>
            )}

            {activeConv !== "community" &&
              activeConv !== "broadcast" &&
              userMap[activeConv] && (
                <>
                  {(() => {
                    const p = userMap[activeConv];
                    const items = threadItems(db, me, activeConv);
                    const onCall = activeCall?.partnerId === activeConv;
                    return (
                      <>
                        {onCall ? (
                          <CallPanel
                            partner={p}
                            onBack={() => setMobilePane("list")}
                          />
                        ) : (
                          <div className="flex items-center gap-3 border-b border-line px-[22px] py-3.5">
                            <BackBtn onClick={() => setMobilePane("list")} />
                            <div
                              className="flex h-[34px] w-[34px] items-center justify-center rounded-full font-display text-xs font-bold text-white"
                              style={{ background: p.color }}
                            >
                              {initials(p.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[13.5px] font-bold">{p.name}</div>
                              <div className="truncate text-[11px] text-ink-faint">
                                {roleLabel(p)} · {p.username}
                              </div>
                            </div>
                            <div className="ml-auto flex gap-2">
                              <button
                                type="button"
                                onClick={() => startCall(p.id)}
                                title="Log a phone call"
                                aria-label={`Log a phone call with ${p.name}`}
                                className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-line bg-surface text-ink-soft transition-colors hover:border-saffron-dim hover:text-ink"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d={PATHS.phone} />
                                </svg>
                              </button>
                              <a
                                href={`https://wa.me/${p.phone.replace("+", "").replace(/\s/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp"
                                className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border-[1.5px] border-line text-ink-soft"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d={PATHS.whatsapp} />
                                </svg>
                              </a>
                            </div>
                          </div>
                        )}
                        <ThreadScroll>
                          {items.length
                            ? items.map((it) =>
                                it.kind === "call" ? (
                                  <CallPill
                                    key={it.id}
                                    call={it.call}
                                    me={me}
                                  />
                                ) : (
                                  <Bubble
                                    key={it.id}
                                    fromId={it.dm.from}
                                    text={it.dm.text}
                                    time={it.dm.at}
                                    me={me}
                                    userMap={userMap}
                                  />
                                ),
                              )
                            : (
                              <div className="py-8 text-center text-[13px] text-ink-faint">
                                No messages yet — say hello.
                              </div>
                            )}
                        </ThreadScroll>
                        <Composer
                          value={input}
                          onChange={setInput}
                          placeholder={`Message ${firstName(p.name)}…`}
                          onSend={() => {
                            if (!input.trim()) return;
                            const text = input.trim();
                            setInput("");
                            void sendDm(activeConv, text).catch(() =>
                              showToast(
                                "Could not send message",
                                "Please try again.",
                              ),
                            );
                          }}
                        />
                      </>
                    );
                  })()}
                </>
              )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="search"
                placeholder="Search the unit…"
                className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5 text-[13px] sm:w-[280px]"
                aria-label="Search the unit"
              />
              <span className="text-[11.5px] font-semibold text-ink-faint">
                {users.length - 1} members
              </span>
            </div>
            {canManageTeamProfiles(sessionUser) && (
              <button
                type="button"
                onClick={() => setAddMemberOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border-none bg-aztec px-[15px] py-2 text-xs font-bold text-white transition-transform hover:-translate-y-px"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d={PATHS.plus} />
                </svg>
                Add member
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {users
                .filter((u) => u.id !== me)
                .map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[18px] border border-line bg-card px-[26px] py-6"
                  >
                    <div className="mb-3.5 flex items-center gap-3">
                      <div
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full font-display text-[15px] font-bold text-white"
                        style={{ background: p.color }}
                      >
                        {initials(p.name)}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-bold">{p.name}</div>
                        <div className="text-[10.5px] font-bold text-ink-faint uppercase">
                          {roleLabel(p)}
                        </div>
                      </div>
                    </div>
                    <div className="mb-3.5 rounded-lg bg-neutral-bg px-2.5 py-1.5 font-mono text-[10.5px] text-ink-faint">
                      {p.username} · {p.phone}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${p.phone.replace("+", "").replace(/\s/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 flex-col items-center gap-1 rounded-[11px] border-[1.5px] border-line px-1.5 py-2.5 text-[10px] font-bold text-ink-soft no-underline"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.whatsapp} />
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        className="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-[11px] border-[1.5px] border-line bg-surface px-1.5 py-2.5 text-[10px] font-bold text-ink-soft"
                        onClick={() => {
                          setView("messages");
                          openThread(p.id);
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.messages} />
                        </svg>
                        Message
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <NewConversation
        key={newConvKey}
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onSelect={openThread}
      />

      {addMemberOpen && (
        <AddMember onClose={() => setAddMemberOpen(false)} />
      )}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-line bg-surface text-ink-soft md:hidden"
      aria-label="Back to conversations"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={PATHS.chevronLeft} />
      </svg>
    </button>
  );
}

function ConvItem({
  active,
  onClick,
  avatar,
  name,
  snippet,
}: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  name: string;
  snippet: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none p-2.5 text-left ${
        active ? "bg-aztec-2" : "bg-transparent hover:bg-neutral-bg"
      }`}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[12.5px] font-bold ${active ? "text-white" : ""}`}
        >
          {name}
        </div>
        <div
          className={`truncate text-[11.5px] ${active ? "text-paper/60" : "text-ink-faint"}`}
        >
          {snippet}
        </div>
      </div>
    </button>
  );
}

function CallPill({
  call,
  me,
}: {
  call: CallRecord;
  me: string;
}) {
  const outgoing = call.from === me;
  return (
    <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[11px] font-bold text-ink-soft">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          outgoing
            ? "bg-saffron/20 text-saffron-dim"
            : "bg-aztec-3 text-white"
        }`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className={outgoing ? "" : "rotate-[135deg]"}
        >
          <path d={PATHS.phone} />
        </svg>
      </span>
      <span>{outgoing ? "You called" : "Incoming call"}</span>
      <span className="font-mono text-ink-faint">
        {formatDuration(call.durationSec)}
      </span>
      <span className="text-ink-faint/70">{call.at}</span>
    </div>
  );
}

function Bubble({
  fromId,
  text,
  time,
  me,
  userMap,
}: {
  fromId: string;
  text: string;
  time: string;
  me: string;
  userMap: ReturnType<typeof useTrak>["userMap"];
}) {
  const isMe = fromId === me;
  const p = userMap[fromId];
  return (
    <div
      className={`flex max-w-[68%] gap-2.5 ${isMe ? "flex-row-reverse self-end" : ""}`}
    >
      <div
        className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold text-white"
        style={{ background: p?.color || "#888" }}
      >
        {initials(p?.name || "?")}
      </div>
      <div
        className={`rounded-[14px] px-3.5 py-2.5 ${
          isMe
            ? "rounded-br-sm bg-aztec-3 text-white"
            : "rounded-bl-sm bg-neutral-bg text-ink"
        }`}
      >
        {!isMe && (
          <div className="mb-0.5 text-[10.5px] font-bold text-ink-faint">
            {firstName(p?.name || "")}
          </div>
        )}
        <div className="text-[13px] leading-snug">{text}</div>
        <div
          className={`mt-1 text-right text-[9.5px] ${isMe ? "text-paper/50" : "text-ink-faint"}`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

function ThreadScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-[#fdfcf9] px-[22px] py-5">
      {children}
    </div>
  );
}

function Composer({
  value,
  onChange,
  placeholder,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSend: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-line px-[22px] pt-4 pb-[76px] md:pb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-full border-[1.5px] border-line px-4 py-3"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
      />
      <button
        type="button"
        onClick={onSend}
        className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-aztec-3 text-white"
        aria-label="Send"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d={PATHS.send} />
        </svg>
      </button>
    </div>
  );
}
