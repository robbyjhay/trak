with open("src/__tests__/rbac.test.ts", "r") as f:
    content = f.read()
content = content.replace("export function createMockUser", "export function createMockUser(opts?: Partial<User>): User {\n  return {\n    id: 'mock',\n    name: 'Mock',\n    username: 'mock',\n    role: 'member',\n    isSecretary: false,\n    isCorps: false,\n    isIntern: false,\n    isActive: true,\n    color: '#000',\n    phone: '',\n    designation: '',\n    gradeLevel: '',\n    sex: '',\n    stateOfOrigin: '',\n    dateJoined: '',\n    photoUrl: null,\n    email: null,\n    ...opts,\n  };\n}\nfunction ignore_old")
with open("src/__tests__/rbac.test.ts", "w") as f:
    f.write(content)

with open("src/app/api/rsvp/route.ts", "r") as f:
    content = f.read()
content = content.replace('source: "link",', 'source: "link", status: "pending",')
with open("src/app/api/rsvp/route.ts", "w") as f:
    f.write(content)

with open("src/components/activity/ActivityDetail.tsx", "r") as f:
    content = f.read()
content = content.replace('source: "manual",', 'source: "manual", status: "pending",')
content = content.replace('source: "unit",', 'source: "unit", status: "pending",')
with open("src/components/activity/ActivityDetail.tsx", "w") as f:
    f.write(content)

with open("src/lib/constants.ts", "r") as f:
    content = f.read()
content = content.replace("broadcast: \"/messages\",", "broadcast: \"/messages\",\n  profile_updated: \"/\",")
with open("src/lib/constants.ts", "w") as f:
    f.write(content)

with open("src/lib/notificationPolicy.ts", "r") as f:
    content = f.read()
content = content.replace('broadcast: {', 'profile_updated: {\n    recipient: "all",\n    title: "Profile Updated",\n    deepLink: "/",\n    prefCategory: "activities",\n    dedupe: "profile_updated",\n  },\n  broadcast: {')
with open("src/lib/notificationPolicy.ts", "w") as f:
    f.write(content)

