import re

with open('src/app/(app)/(shell)/profile/page.tsx', 'r') as f:
    content = f.read()

# Add state and handlers
old_state_block = """  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);"""

new_state_block = """  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  
  const [editEmail, setEditEmail] = useState(u.email || "");
  const [editPhone, setEditPhone] = useState(u.phone || "");
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
  }, [u.email, u.phone]);

  const handleSaveContact = async () => {
    if (savingContact) return;
    setSavingContact(true);
    try {
      await updateUserProfile(u.id, { email: editEmail, phone: editPhone });
      showToast("Contact details saved", "Your profile has been updated.");
    } catch (e: any) {
      showToast("Could not save contact details", typeof e?.message === "string" ? e.message : "Please try again.");
    } finally {
      setSavingContact(false);
    }
  };"""

content = content.replace(old_state_block, new_state_block)

# Replace the personnel record loop part
# We need to render the existing array but without Email and Phone in the generic read-only list,
# and instead render editable fields for email and phone.

old_render_block = """          <dl>
            {(
              [
                ["Full name", u.name],
                ["Designation", u.designation || "—"],
                ["Role", roleLabel(u)],
                ["Grade level", u.gradeLevel || "—"],
                ["Sex", u.sex || "—"],
                ["Phone", u.phone || "—"],
                ["State of origin", u.stateOfOrigin || "—"],
                ["Date joined PSSDC", u.dateJoined ? fmtDate(u.dateJoined) : "—"],
                ["Username", u.username],
              ] as const
            ).map(([k, v]) => ("""

new_render_block = """          <dl>
            {/* Contact details are editable */}
            <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-3 sm:grid-cols-[160px_1fr]">
              <dt className="text-[12.5px] text-foreground-secondary">Email</dt>
              <dd className="flex items-center gap-2">
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="name@example.com"
                />
              </dd>
            </div>
            <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-3 sm:grid-cols-[160px_1fr]">
              <dt className="text-[12.5px] text-foreground-secondary">Phone</dt>
              <dd className="flex items-center gap-2">
                <input 
                  type="tel" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="+234..."
                />
              </dd>
            </div>
            {(u.email !== editEmail || u.phone !== editPhone) && (
              <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-2 sm:grid-cols-[160px_1fr]">
                <dt></dt>
                <dd>
                  <button 
                    onClick={handleSaveContact} 
                    disabled={savingContact}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {savingContact ? "Saving..." : "Save changes"}
                  </button>
                </dd>
              </div>
            )}
            
            {(
              [
                ["Full name", u.name],
                ["Designation", u.designation || "—"],
                ["Role", roleLabel(u)],
                ["Grade level", u.gradeLevel || "—"],
                ["Sex", u.sex || "—"],
                ["State of origin", u.stateOfOrigin || "—"],
                ["Date joined PSSDC", u.dateJoined ? fmtDate(u.dateJoined) : "—"],
                ["Username", u.username],
              ] as const
            ).map(([k, v]) => ("""

content = content.replace(old_render_block, new_render_block)

with open('src/app/(app)/(shell)/profile/page.tsx', 'w') as f:
    f.write(content)
