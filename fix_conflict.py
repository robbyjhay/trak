with open("src/context/TrakStore.tsx", "r") as f:
    text = f.read()

conflict_1 = """<<<<<<< Updated upstream
        replyToId: null,
=======
        replyToId: replyToId || null,
>>>>>>> Stashed changes"""

text = text.replace(conflict_1, "        replyToId: replyToId || null,")

conflict_2 = """<<<<<<< Updated upstream
=======
        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.community.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,
>>>>>>> Stashed changes"""

replacement_2 = """        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.community.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,"""

text = text.replace(conflict_2, replacement_2)

with open("src/context/TrakStore.tsx", "w") as f:
    f.write(text)

