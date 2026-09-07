with open("src/lib/db/service.ts", "r") as f:
    sv = f.read()

if "profile_updated" not in sv:
    sv = sv.replace('import { requireActor, requireRole, canDelegate, canBroadcast } from "@/lib/auth/session";', 'import { requireActor, requireRole, canDelegate, canBroadcast } from "@/lib/auth/session";\nimport { broadcast } from "@/lib/realtime";')
    sv = sv.replace('  u.photoUrl = publicStorageUrl(u.photoUrl);\n  return u;\n}\n\nexport type NewUserInput', '  u.photoUrl = publicStorageUrl(u.photoUrl);\n  broadcast({ type: "profile_updated", user: u });\n  return u;\n}\n\nexport type NewUserInput')
    # Add anyChanged logic
    old_update = """  const allowedPatch: ProfilePatch = {};

  // Everyone can update their own email, phone, and photoUrl
  if (patch.email !== undefined) {
    allowedPatch.email = patch.email;
  }"""
    new_update = """  const allowedPatch: ProfilePatch = {};
  let emailChanged = false;
  let phoneChanged = false;
  // Tracks whether any submitted value actually differs from the stored row, so
  // a no-op submit (same email/phone/etc.) performs no DB write and emits no
  // profile_updated broadcast or duplicate notification.
  let anyChanged = false;

  // Everyone can update their own email, phone, and photoUrl
  if (patch.email !== undefined) {
    allowedPatch.email = patch.email;
    if (patch.email !== existing.email) { emailChanged = true; anyChanged = true; }
  }
  if (patch.phone !== undefined) {
    if (patch.phone !== existing.profile?.phone) anyChanged = true;
  }
  if (patch.photoUrl !== undefined) {
    if (patch.photoUrl !== existing.profile?.photoUrl) anyChanged = true;
  }
  if (patch.color !== undefined) {
    if (patch.color !== existing.profile?.color) anyChanged = true;
  }
  if (patch.bio !== undefined) {
    if (patch.bio !== existing.profile?.bio) anyChanged = true;
  }
"""
    sv = sv.replace(old_update, new_update)

    old_submit = """  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: allowedPatch.email,
      profile: {
        upsert: {
          create: {
            phone: allowedPatch.phone ?? existing.profile?.phone ?? "",
            color: allowedPatch.color ?? existing.profile?.color ?? "#8a6a1f",
            bio: allowedPatch.bio ?? existing.profile?.bio ?? "",
            photoUrl: allowedPatch.photoUrl ?? existing.profile?.photoUrl,
          },
          update: {
            phone: allowedPatch.phone,
            color: allowedPatch.color,
            bio: allowedPatch.bio,
            photoUrl: allowedPatch.photoUrl,
          },
        },
      },
    },
    include: { profile: true },
  });"""
    new_submit = """  // No-op submit: nothing changed, so return the canonical row without writing,
  // notifying, or broadcasting a spurious profile_updated event.
  if (!anyChanged) {
    const u = mapUser(existing);
    u.photoUrl = publicStorageUrl(u.photoUrl);
    return u;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: allowedPatch.email,
      profile: {
        upsert: {
          create: {
            phone: allowedPatch.phone ?? existing.profile?.phone ?? "",
            color: allowedPatch.color ?? existing.profile?.color ?? "#8a6a1f",
            bio: allowedPatch.bio ?? existing.profile?.bio ?? "",
            photoUrl: allowedPatch.photoUrl ?? existing.profile?.photoUrl,
          },
          update: {
            phone: allowedPatch.phone,
            color: allowedPatch.color,
            bio: allowedPatch.bio,
            photoUrl: allowedPatch.photoUrl,
          },
        },
      },
    },
    include: { profile: true },
  });"""
    sv = sv.replace(old_submit, new_submit)
    with open("src/lib/db/service.ts", "w") as f:
        f.write(sv)

