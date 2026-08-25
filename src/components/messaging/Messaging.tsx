"use client";

import { useEffect, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { useConnectNav } from "@/context/ConnectNav";
import {
  canBroadcast,
  canDeleteAnyCommunityMessage,
  canManageTeamProfiles,
  canWipeCommunity,
  roleLabel,
} from "@/lib/permissions";
import { cn, firstName, initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { NewConversation } from "@/components/messaging/NewConversation";
import { AddMember } from "@/components/messaging/AddMember";
import { CallPanel } from "@/components/call/CallPanel";
import { useCall } from "@/context/CallContext";
import type { CallRecord, Dm, TrakDb } from "@/lib/types";

// New specialized components
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";

type ThreadItem =
  | { kind: "dm"; id: string; dm: Dm }
  | { kind: "call"; id: string; call: CallRecord };

function getCreatedAt(item: ThreadItem): number {
  if (item.kind === "dm") return new Date(item.dm.at).getTime();
  if (item.kind === "call") return new Date(item.call.at).getTime();
  return 0;
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
  ].sort((x, y) => getCreatedAt(x) - getCreatedAt(y));
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
    deleteDmMessage,
    deleteCommunityMessage,
    showToast,
  } = useTrak();
  const { view, setView, setMobileThreadOpen } = useConnectNav();
  const { activeCall, startCall } = useCall();
  
  const me = sessionUser.id;
  
  const [activeConv, setActiveConv] = useState<string>("community");
  const [mobilePane, setMobilePane] = useState<"list" | "thread">("list");
  const [input, setInput] = useState("");
  const [bcText, setBcText] = useState("");
  const [wipeOpen, setWipeOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvKey, setNewConvKey] = useState(0);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [contactsSearch, setContactsSearch] = useState("");

  useEffect(() => {
    setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMobileThreadOpen(mobilePane === "thread");
  }, [mobilePane, setMobileThreadOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash !== "#thread" && mobilePane === "thread") {
        setMobilePane("list");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobilePane]);

  const canBc = canBroadcast(sessionUser);
  const canWipe = canWipeCommunity(sessionUser);
  const canDeleteAny = canDeleteAnyCommunityMessage(sessionUser);

  function openThread(pid: string) {
    setActiveConv(pid);
    if (window.innerWidth < 768) {
      window.history.pushState(null, "", "#thread");
    }
    setMobilePane("thread");
    setNewConvOpen(false);
  }

  function handleBack() {
    if (window.location.hash === "#thread") {
      window.history.back();
    } else {
      setMobilePane("list");
    }
  }

  return (
    <div className="h-full bg-background">
      {view === "messages" ? (
        <div className="flex h-full overflow-hidden">
          {/* Conversation List Panel */}
          <ConversationList
            activeConv={activeConv}
            setActiveConv={setActiveConv}
            mobilePane={mobilePane}
            setMobilePane={setMobilePane}
            canBc={canBc}
            onNewConv={() => {
              setNewConvKey((k) => k + 1);
              setNewConvOpen(true);
            }}
          />

          {/* Active Thread Panel */}
          <div
            className={cn(
              "min-w-0 flex-1 flex-col bg-background shadow-[-10px_0_20px_-15px_rgba(0,0,0,0.1)] z-10",
              mobilePane === "list"
                ? "hidden md:flex"
                : "fixed inset-0 z-[100] flex md:static md:z-auto",
            )}
          >
            {activeConv === "community" && (
              <>
                <div className="flex items-center gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6 md:px-8 shadow-sm z-10">
                  <BackBtn onClick={handleBack} />
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-surface-interactive text-primary border border-border/50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d={PATHS.users} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-foreground tracking-tight">Community Chat</div>
                    <div className="truncate text-[11.5px] font-medium text-foreground-secondary mt-0.5">
                      Visible to all {users.length} unit members
                    </div>
                  </div>
                  {canWipe && (
                    <button
                      type="button"
                      className="ml-auto flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-xl border border-critical-semantic/30 bg-surface text-critical-semantic hover:bg-critical-surface transition-colors"
                      onClick={() => setWipeOpen((v) => !v)}
                      aria-label="Wipe community chat"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={PATHS.trash} />
                      </svg>
                    </button>
                  )}
                </div>
                {canWipe && wipeOpen && (
                  <div className="flex items-center gap-3 border-b border-critical-semantic/30 bg-critical-surface px-4 py-3 sm:px-6 md:px-8 z-10">
                    <label className="text-[12px] font-extrabold tracking-wide text-critical-semantic uppercase">
                      Wipe all community messages
                    </label>
                    <button
                      type="button"
                      className="ml-auto cursor-pointer rounded-[10px] border-none bg-critical-semantic px-4 py-2 text-[12px] font-bold text-critical-foreground hover:opacity-90 transition-opacity shadow-sm"
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
                
                <ChatThread 
                  items={[...db.community].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).map(m => ({ kind: "dm", id: m.id, dm: m as unknown as Dm }))} 
                  me={me} 
                  userMap={userMap} 
                  isGroup={true}
                  onDeleteMessage={(messageId, forEveryone) => {
                    void deleteCommunityMessage(messageId, forEveryone).catch(() =>
                      showToast("Could not delete message", "Please try again."),
                    );
                  }}
                  canDeleteAny={canDeleteAny}
                />
                
                <Composer
                  value={input}
                  onChange={setInput}
                  placeholder="Message the whole unit…"
                  onSend={(attachments) => {
                    if (!input.trim() && (!attachments || attachments.length === 0)) return;
                    const text = input.trim();
                    setInput("");
                    void sendCommunity(text, attachments).catch(() =>
                      showToast("Could not send message", "Please try again."),
                    );
                  }}
                />
              </>
            )}

            {activeConv === "broadcast" && (
              <div className="flex flex-1 flex-col bg-surface">
                <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6 md:px-8 shadow-sm md:hidden z-10">
                  <BackBtn onClick={handleBack} />
                  <div className="text-[15px] font-bold text-foreground">Broadcast</div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-10 max-w-2xl mx-auto">
                  <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-xl">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d={PATHS.send} />
                    </svg>
                  </div>
                  <h3 className="m-0 mb-3 font-display text-2xl font-bold text-foreground tracking-tight">
                    Broadcast to the unit
                  </h3>
                  <p className="mb-8 max-w-[420px] text-[14px] leading-relaxed text-foreground-secondary">
                    Only the Unit Head and the Secretary can send this. It reaches all{" "}
                    <strong className="text-foreground">{users.length} members</strong> at once and triggers a push notification.
                  </p>
                  <textarea
                    value={bcText}
                    onChange={(e) => setBcText(e.target.value)}
                    placeholder="Write your announcement…"
                    className="mb-5 min-h-[140px] w-full max-w-[500px] rounded-[18px] border-[1.5px] border-input-border bg-input px-5 py-4 text-[14.5px] text-foreground placeholder-input-placeholder outline-none focus:border-border-strong shadow-sm transition-colors resize-none"
                    suppressHydrationWarning
                  />
                  <PrimaryBtn
                    className="h-[48px] px-8 rounded-full text-[14px] font-bold shadow-md hover:scale-105 active:scale-95 transition-transform"
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="-ml-1 mr-1.5">
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
                            onBack={handleBack}
                          />
                        ) : (
                          <div className="flex items-center gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6 md:px-8 shadow-sm z-10">
                            <BackBtn onClick={handleBack} />
                            <div
                              className="flex h-[42px] w-[42px] items-center justify-center rounded-full font-display text-[15px] font-bold text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ background: p.color }}
                              title="View Profile"
                            >
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : initials(p.name)}
                            </div>
                            <div className="min-w-0 flex-1 cursor-pointer" title="View Profile">
                              <div className="truncate text-[15.5px] font-bold text-foreground tracking-tight">{p.name}</div>
                              <div className="truncate text-[11.5px] font-medium text-foreground-secondary mt-0.5">
                                {roleLabel(p)} · {p.username}
                              </div>
                            </div>
                            <div className="ml-auto flex gap-2.5">
                              <button
                                type="button"
                                onClick={() => startCall(p.id)}
                                title="Start Voice Call"
                                aria-label={`Call ${p.name}`}
                                className="flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-full border border-border/80 bg-surface text-foreground-secondary transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5 shadow-sm"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d={PATHS.phone} />
                                </svg>
                              </button>
                              <a
                                href={`https://wa.me/${p.phone.replace("+", "").replace(/\s/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp"
                                className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-border/80 bg-surface text-foreground-secondary transition-colors hover:border-[#25D366]/50 hover:text-[#25D366] hover:bg-[#25D366]/5 shadow-sm"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d={PATHS.whatsapp} />
                                </svg>
                              </a>
                            </div>
                          </div>
                        )}
                        
                        <ChatThread 
                          items={items} 
                          me={me} 
                          userMap={userMap}
                          onDeleteMessage={(messageId, forEveryone) => {
                            void deleteDmMessage(messageId, forEveryone).catch(() =>
                              showToast("Could not delete message", "Please try again."),
                            );
                          }}
                        />
                        
                        <Composer
                          value={input}
                          onChange={setInput}
                          placeholder={`Message ${firstName(p.name)}…`}
                          onSend={(attachments) => {
                            if (!input.trim() && (!attachments || attachments.length === 0)) return;
                            const text = input.trim();
                            setInput("");
                            void sendDm(activeConv, text, attachments).catch((err) =>
                              showToast(
                                "Could not send message",
                                err?.message || "Please try again.",
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
        <div className="flex h-full flex-col px-4 py-5 sm:px-6 md:px-8 max-w-7xl mx-auto">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="m-0 text-2xl font-extrabold text-foreground tracking-tight">Contacts</h1>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="search"
                  placeholder="Search the unit…"
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  className="w-full rounded-full border border-input-border bg-input pl-10 pr-4 py-2 text-[14px] text-foreground placeholder-input-placeholder outline-none focus:border-border-strong sm:w-[320px] transition-colors shadow-sm"
                  aria-label="Search the unit"
                  suppressHydrationWarning
                />
              </div>
              <span className="text-[12.5px] font-bold text-foreground-secondary bg-surface-muted px-3 py-1.5 rounded-full border border-border/50">
                {users.length - 1} members
              </span>
            </div>
            {canManageTeamProfiles(sessionUser) && (
              <button
                type="button"
                onClick={() => setAddMemberOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border-none bg-primary px-5 py-2.5 text-[13.5px] font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-px hover:shadow-md hover:bg-primary-hover active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d={PATHS.plus} />
                </svg>
                Add member
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-6 scrollbar-thin">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {users
                .filter((u) => u.id !== me)
                .filter((u) => contactsSearch ? u.name.toLowerCase().includes(contactsSearch.toLowerCase()) || u.username?.toLowerCase().includes(contactsSearch.toLowerCase()) : true)
                .map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[24px] border border-border bg-surface px-6 py-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div
                        className="flex h-[52px] w-[52px] items-center justify-center rounded-full font-display text-[18px] font-bold text-white shadow-sm"
                        style={{ background: p.color }}
                      >
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : initials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[15.5px] font-bold text-foreground tracking-tight">{p.name}</div>
                        <div className="truncate text-[11.5px] font-bold tracking-wide text-foreground-faint uppercase mt-0.5">
                          {roleLabel(p)}
                        </div>
                      </div>
                    </div>
                    <div className="mb-5 rounded-[12px] bg-surface-muted border border-border/50 px-3 py-2 font-mono text-[11.5px] text-foreground-secondary flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        {p.username}
                      </div>
                      {p.phone && (
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={PATHS.phone}></path></svg>
                          {p.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2.5 mt-auto">
                      <a
                        href={`https://wa.me/${p.phone?.replace("+", "").replace(/\s/g, "") || ""}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-bold text-foreground-secondary no-underline hover:border-[#25D366]/50 hover:bg-[#25D366]/5 hover:text-[#25D366] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d={PATHS.whatsapp} />
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-bold text-foreground-secondary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => {
                          setView("messages");
                          openThread(p.id);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d={PATHS.messages} />
                        </svg>
                        Message
                      </button>
                    </div>
                  </div>
                ))}
                {users.filter(u => u.id !== me).filter((u) => contactsSearch ? u.name.toLowerCase().includes(contactsSearch.toLowerCase()) || u.username?.toLowerCase().includes(contactsSearch.toLowerCase()) : true).length === 0 && (
                  <div className="col-span-full py-12 text-center text-[14px] text-foreground-faint">
                    No contacts matched your search
                  </div>
                )}
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
      className="flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-surface text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors md:hidden shadow-sm"
      aria-label="Back to conversations"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d={PATHS.chevronLeft} />
      </svg>
    </button>
  );
}
