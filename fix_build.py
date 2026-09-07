with open("src/__tests__/rbac.test.ts", "r") as f:
    ts = f.read()
ts = ts.replace("...opts,", "...opts, email: opts?.email ?? null,")
with open("src/__tests__/rbac.test.ts", "w") as f:
    f.write(ts)

with open("src/components/activity/ActivityDetail.tsx", "r") as f:
    ts = f.read()
ts = ts.replace('{ name: string; phone: string; email: string; source: "unit" }', '{ name: string; phone: string; email: string; source: "unit"; status: any }')
ts = ts.replace('source: "unit",\n                        }', 'source: "unit",\n                          status: "pending",\n                        }')
with open("src/components/activity/ActivityDetail.tsx", "w") as f:
    f.write(ts)

with open("src/components/messaging/Messaging.tsx", "r") as f:
    ts = f.read()
ts = ts.replace("markNotifsRead,\n", "")
with open("src/components/messaging/Messaging.tsx", "w") as f:
    f.write(ts)

with open("src/lib/constants.ts", "r") as f:
    ts = f.read()
ts = ts.replace('broadcast: "/messages",', 'broadcast: "/messages",\n  profile_updated: "/",')
with open("src/lib/constants.ts", "w") as f:
    f.write(ts)
