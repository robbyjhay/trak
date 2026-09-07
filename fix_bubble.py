with open("src/components/messaging/Bubble.tsx", "r") as f:
    ts = f.read()
if "LinkPreviewCard" not in ts:
    ts = ts.replace('import type { MessageAttachment, MessageMention, ReplyPreview } from "@/lib/types";', 'import type { MessageAttachment, MessageMention, ReplyPreview, LinkPreview } from "@/lib/types";\nimport { LinkPreviewCard } from "./LinkPreviewCard";')
    ts = ts.replace('  isHighlighted = false,\n}: {', '  isHighlighted = false,\n  linkPreview,\n}: {')
    ts = ts.replace('  isHighlighted?: boolean;\n}) {', '  isHighlighted?: boolean;\n  linkPreview?: LinkPreview | null;\n}) {')
    ts = ts.replace('{attachments && attachments.length > 0 && (', '{linkPreview && (\n              <LinkPreviewCard preview={linkPreview} me={isMe} />\n            )}\n            {attachments && attachments.length > 0 && (')
    with open("src/components/messaging/Bubble.tsx", "w") as f:
        f.write(ts)
