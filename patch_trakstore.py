with open("src/context/TrakStore.tsx", "r") as f:
    content = f.read()

# Add TrakLoader import
content = content.replace('import { showToast } from "@/components/ui/Toast";\n', 'import { showToast } from "@/components/ui/Toast";\nimport { TrakLoader } from "@/components/ui/TrakLoader";\n')

# Replace the loading spinner
old_loader = """      <div
        className="flex min-h-screen items-center justify-center bg-paper text-ink-soft"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-aztec"
            aria-hidden
          />
          <div className="mb-2 font-display text-lg font-semibold text-ink">
            Loading Trak…
          </div>
          <div className="text-sm">Syncing with server</div>
        </div>
      </div>"""
new_loader = """      <div
        className="flex min-h-screen items-center justify-center bg-paper text-ink-soft dark:bg-aztec"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <TrakLoader />
          </div>
          <div className="text-sm font-medium text-ink-soft dark:text-[#ffffff]">Syncing with server</div>
        </div>
      </div>"""
content = content.replace(old_loader, new_loader)

with open("src/context/TrakStore.tsx", "w") as f:
    f.write(content)
