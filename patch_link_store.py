with open("src/context/TrakStore.tsx", "r") as f:
    ts = f.read()
if "link_preview_ready" not in ts:
    old_store = """      // ---------------------------------------------------------------------
      // Update
      // ---------------------------------------------------------------------

      if (data.type === "message_deleted") {"""
    
    new_store = """      // ---------------------------------------------------------------------
      // Update
      // ---------------------------------------------------------------------

      if (data.type === "link_preview_ready" && data.messageId && data.linkPreview) {
        const dms = stateRef.current.db.dms;
        const comm = stateRef.current.db.community;
        const dm = dms.find((m) => m.id === data.messageId);
        const cm = comm.find((m) => m.id === data.messageId);
        if (dm) (dm as any).linkPreview = data.linkPreview;
        else if (cm) (cm as any).linkPreview = data.linkPreview;
        bump();
      }

      if (data.type === "message_deleted") {"""
    ts = ts.replace(old_store, new_store)
    with open("src/context/TrakStore.tsx", "w") as f:
        f.write(ts)
