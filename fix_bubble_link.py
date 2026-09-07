with open("src/components/messaging/Bubble.tsx", "r") as f:
    ts = f.read()

weird_block = """          {!isDeleted && linkPreview && (
            <div className="mt-0.5">
            </div>
          )}"""

if weird_block in ts:
    ts = ts.replace(weird_block, "")
    with open("src/components/messaging/Bubble.tsx", "w") as f:
        f.write(ts)
