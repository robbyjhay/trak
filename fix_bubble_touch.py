import re

with open("src/components/messaging/Bubble.tsx", "r") as f:
    text = f.read()

# Replace the button onClick with onPointerDown and onClick
old_btn = """                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Mention Click! UserID: " + seg.userId + " Type: " + typeof seg.userId + " \\nonMentionClick is: " + typeof onMentionClick); onMentionClick?.(seg.userId);
                    }}"""

new_btn = """                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMentionClick?.(seg.userId);
                    }}"""

text = text.replace(old_btn, new_btn)

# Just in case the alert was not applied, also replace the original:
orig_btn = """                    onClick={(e) => {
                      e.stopPropagation();
                      onMentionClick?.(seg.userId);
                    }}"""

text = text.replace(orig_btn, new_btn)

with open("src/components/messaging/Bubble.tsx", "w") as f:
    f.write(text)

