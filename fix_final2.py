with open("src/components/messaging/Messaging.tsx", "r") as f:
    ts = f.read()
ts = ts.replace("console.log(idsToMark).catch(() => {});", "console.log(idsToMark);")
with open("src/components/messaging/Messaging.tsx", "w") as f:
    f.write(ts)

with open("src/lib/constants.ts", "r") as f:
    ts = f.read()
if "profile_updated:" not in ts:
    ts = ts.replace('broadcast: "/messages",', 'broadcast: "/messages",\n  profile_updated: "/",\n  guestCode: "/",')
    with open("src/lib/constants.ts", "w") as f:
        f.write(ts)
