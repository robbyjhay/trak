with open("src/lib/types.ts", "r") as f:
    types = f.read()

if "guest" not in types:
    types = types.replace('export type AttendeeSource = "unit" | "manual" | "link";', 'export type AttendeeSource = "unit" | "manual" | "link" | "guest";\nexport type AttendeeStatus = "pending" | "verified" | "declined";')
    types = types.replace('export interface Attendee {\n  name: string;\n  phone: string;\n  email: string;\n  source: AttendeeSource;\n  at?: string;\n}', 'export interface Attendee {\n  userId?: string;\n  name: string;\n  phone: string;\n  email: string;\n  source: AttendeeSource;\n  status: AttendeeStatus;\n  at?: string;\n}')
    with open("src/lib/types.ts", "w") as f:
        f.write(types)
