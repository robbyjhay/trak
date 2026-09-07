with open("src/components/messaging/Bubble.tsx", "r") as f:
    lines = f.readlines()

new_imports = """import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MessageAttachment, MessageMention, ReplyPreview, LinkPreview } from "@/lib/types";
import { LinkPreviewCard } from "./LinkPreviewCard";
"""

with open("src/components/messaging/Bubble.tsx", "w") as f:
    for i, line in enumerate(lines):
        if i == 9:
            f.write(new_imports)
        elif 9 < i < 18:
            pass # Skip old bad lines
        else:
            f.write(line)
