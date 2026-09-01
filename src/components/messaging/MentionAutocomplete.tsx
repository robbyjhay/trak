"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { initials } from "@/lib/utils";
import type { User } from "@/lib/types";

export interface MentionData {
  userId: string;
  displayName: string;
  position: number;
}

export interface MentionSelect {
  userId: string;
  displayName: string;
}

interface MentionAutocompleteProps {
  query: string;
  users: User[];
  currentUserId: string;
  onSelect: (mention: MentionSelect) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function parseMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1])) return null;
  const query = before.slice(atIndex + 1);
  if (/\n/.test(query)) return null;
  return { query, start: atIndex };
}

export function insertMention(
  text: string,
  start: number,
  cursorPos: number,
  mention: MentionData,
): { text: string; cursorPos: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursorPos);
  const mentionText = `@${mention.displayName}`;
  const newText = `${before}${mentionText} ${after}`;
  const newCursor = start + mentionText.length + 1;
  return { text: newText, cursorPos: newCursor };
}

const MAX_RESULTS = 8;

export function MentionAutocomplete({
  query,
  users,
  currentUserId,
  onSelect,
  onClose,
  isOpen,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = users
    .filter((u) => u.id !== currentUserId && u.isActive)
    .filter((u) => {
      const q = query.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    })
    .slice(0, MAX_RESULTS);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (user: User) => {
      onSelect({ userId: user.id, displayName: user.name });
    },
    [onSelect],
  );

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, handleSelect, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
      <div
        ref={listRef}
        className="mx-4 max-h-[240px] overflow-y-auto rounded-[14px] border border-border bg-surface-elevated shadow-xl scrollbar-thin sm:mx-6 md:mx-8"
      >
        {filtered.map((user, i) => (
          <button
            key={user.id}
            ref={(el) => { itemRefs.current[i] = el; }}
            type="button"
            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors border-none bg-transparent cursor-pointer ${
              i === selectedIndex
                ? "bg-surface-hover"
                : "hover:bg-surface-hover"
            } ${i === 0 ? "rounded-t-[14px]" : ""} ${i === filtered.length - 1 ? "rounded-b-[14px]" : ""}`}
            onClick={() => handleSelect(user)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div
              className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white shadow-sm"
              style={{ background: user.color }}
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold text-foreground">{user.name}</div>
              <div className="truncate text-[11px] text-foreground-faint">@{user.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
