/**
 * Phase 0 seed — users, profiles, preferences only.
 * Head always seeded. Demo members only when SEED_DEMO_USERS=true.
 *
 * Run: npx prisma db seed  (or npm run db:seed)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for seed");
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;
const SEED_DEMO =
  process.env.SEED_DEMO_USERS === "true" || process.env.SEED_DEMO_USERS === "1";
const ENABLE_DEV =
  process.env.ENABLE_DEV_LOGIN === "true" ||
  process.env.ENABLE_DEV_LOGIN === "1";

type SeedUser = {
  username: string;
  name: string;
  role: "head" | "member";
  isSecretary?: boolean;
  isCorps?: boolean;
  color: string;
  phone: string;
  designation: string;
  gradeLevel: string;
  sex: string;
  stateOfOrigin: string;
  dateJoined: string;
  corpsEnd?: string;
};

const HEAD: SeedUser = {
  username: "DLUARU",
  name: "Babajide Arulogun",
  role: "head",
  color: "#8a6a1f",
  phone: "+234 703 319 8115",
  designation: "Head, Digital Learning Unit",
  gradeLevel: "GL 14",
  sex: "Male",
  stateOfOrigin: "Ogun",
  dateJoined: "2016-03-02",
};

const DEMO_MEMBERS: SeedUser[] = [
  {
    username: "DLUOGU",
    name: "Benson Ogunyemi",
    role: "member",
    color: "#0e6b47",
    phone: "+234 70 3636 3381",
    designation: "Instructional Designer",
    gradeLevel: "GL 10",
    sex: "Male",
    stateOfOrigin: "Oyo",
    dateJoined: "2019-07-15",
  },
  {
    username: "DLUIBR",
    name: "Agbaje Ibrahim",
    role: "member",
    color: "#9a4428",
    phone: "+234 70 1164 0728",
    designation: "LMS Content Officer",
    gradeLevel: "GL 09",
    sex: "Male",
    stateOfOrigin: "Kwara",
    dateJoined: "2020-01-20",
  },
  {
    username: "DLUHAM",
    name: "Rufai Hamzat",
    role: "member",
    color: "#1f7fa8",
    phone: "+234 80 3489 5621",
    designation: "Systems & Process Officer",
    gradeLevel: "GL 09",
    sex: "Male",
    stateOfOrigin: "Kano",
    dateJoined: "2020-09-08",
  },
  {
    username: "DLUQUD",
    name: "Busari Qudus",
    role: "member",
    color: "#5a4413",
    phone: "+234 81 2388 6412",
    designation: "Studio & Production Officer",
    gradeLevel: "GL 08",
    sex: "Male",
    stateOfOrigin: "Lagos",
    dateJoined: "2021-02-11",
  },
  {
    username: "DLUOLA",
    name: "Omolara Olaiya",
    role: "member",
    color: "#193b34",
    phone: "+234 80 3540 9238",
    designation: "Virtual Programmes Officer",
    gradeLevel: "GL 09",
    sex: "Female",
    stateOfOrigin: "Ondo",
    dateJoined: "2020-05-04",
  },
  {
    username: "DLUAJA",
    name: "Omolola Ajayi",
    role: "member",
    color: "#7a4b1e",
    phone: "+234 90 2401 2487",
    designation: "Training & Curriculum Officer",
    gradeLevel: "GL 10",
    sex: "Female",
    stateOfOrigin: "Osun",
    dateJoined: "2018-11-19",
  },
  {
    username: "DLUADE",
    name: "Oyindamola Adesara",
    role: "member",
    isSecretary: true,
    color: "#8a6c19",
    phone: "+234 903 999 7601",
    designation: "Unit Secretary",
    gradeLevel: "GL 08",
    sex: "Female",
    stateOfOrigin: "Ekiti",
    dateJoined: "2021-06-01",
  },
  {
    username: "DLUJEF",
    name: "Okikiola Jefferson",
    role: "member",
    isCorps: true,
    corpsEnd: "2027-01-15",
    color: "#3a5a1f",
    phone: "+234 80 7872 3310",
    designation: "NYSC Corps Member (IT/LMS Support)",
    gradeLevel: "—",
    sex: "Male",
    stateOfOrigin: "Delta",
    dateJoined: "2026-01-15",
  },
];

function resolveSeedPassword(): string {
  if (process.env.NODE_ENV === "production" && !ENABLE_DEV) {
    // Production seed: random password + mustChangePassword; print once
    const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
    return randomBytes(18).toString("base64url");
  }
  const fromEnv = process.env.DEV_SEED_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 12) return fromEnv;
  if (ENABLE_DEV) return "TrakDevPass123!";
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  return randomBytes(18).toString("base64url");
}

async function upsertUser(seed: SeedUser, passwordHash: string) {
  const usernameNormalized = seed.username.toLowerCase();
  const dateJoined = seed.dateJoined
    ? new Date(seed.dateJoined)
    : null;
  const corpsEnd = seed.corpsEnd ? new Date(seed.corpsEnd) : null;

  const user = await prisma.user.upsert({
    where: { usernameNormalized },
    create: {
      username: seed.username,
      usernameNormalized,
      passwordHash,
      role: seed.role,
      isSecretary: Boolean(seed.isSecretary),
      isCorps: Boolean(seed.isCorps),
      mustChangePassword: true,
      isActive: true,
      profile: {
        create: {
          name: seed.name,
          phone: seed.phone,
          designation: seed.designation,
          gradeLevel: seed.gradeLevel,
          sex: seed.sex,
          stateOfOrigin: seed.stateOfOrigin,
          dateJoined,
          corpsEnd,
          color: seed.color,
        },
      },
      preferences: {
        create: {},
      },
    },
    update: {
      passwordHash,
      role: seed.role,
      isSecretary: Boolean(seed.isSecretary),
      isCorps: Boolean(seed.isCorps),
      mustChangePassword: true,
      isActive: true,
      profile: {
        upsert: {
          create: {
            name: seed.name,
            phone: seed.phone,
            designation: seed.designation,
            gradeLevel: seed.gradeLevel,
            sex: seed.sex,
            stateOfOrigin: seed.stateOfOrigin,
            dateJoined,
            corpsEnd,
            color: seed.color,
          },
          update: {
            name: seed.name,
            phone: seed.phone,
            designation: seed.designation,
            gradeLevel: seed.gradeLevel,
            sex: seed.sex,
            stateOfOrigin: seed.stateOfOrigin,
            dateJoined,
            corpsEnd,
            color: seed.color,
          },
        },
      },
      preferences: {
        upsert: {
          create: {},
          update: {},
        },
      },
    },
  });

  return user;
}

const SEED_RESPONSIBILITIES: Array<{
  code: string;
  name: string;
  description: string;
  deliverables: string[];
}> = [
  {
    code: "LMS-CP",
    name: "LMS Course Production & Digitalisation",
    description:
      "End-to-end conversion of traditional learning materials into engaging, interactive digital course content for the LMS.",
    deliverables: [
      "Digitised course modules",
      "SCORM-compliant packages",
      "LMS-ready deployments",
    ],
  },
  {
    code: "VLP-M",
    name: "Virtual Learning Programmes Management",
    description:
      "Strategic planning, coordination, and execution of all virtual learning programmes delivered through the PSSDC platform.",
    deliverables: [
      "Virtual programme schedules",
      "Facilitator onboarding",
      "Evaluation reports",
    ],
  },
  {
    code: "LMS-SO",
    name: "LMS Studio Operations",
    description:
      "Management and administration of the DLU production studio — equipment, scheduling, technical support.",
    deliverables: [
      "Studio resource schedule",
      "Equipment maintenance logs",
      "Utilisation reports",
    ],
  },
  {
    code: "WPD",
    name: "PSSDC Work Process Digitalisation",
    description:
      "Systematic analysis, redesign, and digital transformation of existing PSSDC work processes.",
    deliverables: [
      "Digitalised workflow docs",
      "Automation solutions",
      "Efficiency reports",
    ],
  },
  {
    code: "WTU",
    name: "Website Technical Updates & Management",
    description:
      "Technical administration, maintenance, and continuous improvement of PSSDC's web presence.",
    deliverables: [
      "Content updates",
      "Security audit reports",
      "UX enhancements",
    ],
  },
  {
    code: "ISTP-D",
    name: "Internal Staff Training Programme Development",
    description:
      "Research, design, development, and implementation of training programmes for internal PSSDC staff.",
    deliverables: [
      "Training needs assessments",
      "Curriculum & syllabi",
      "Impact reports",
    ],
  },
  {
    code: "LSTP-D",
    name: "Lagos State Staff Training Programme Development",
    description:
      "Conceptualisation, design, and execution of large-scale training programmes for the Lagos State public service.",
    deliverables: [
      "State-wide programme designs",
      "Stakeholder engagement plans",
      "Multi-cohort delivery",
    ],
  },
  {
    code: "I-DAP",
    name: "Internal Digital Applications Development",
    description:
      "Planning, development, testing, and deployment of custom digital applications for internal PSSDC needs.",
    deliverables: [
      "Requirement specs",
      "Deployed applications",
      "Maintenance & updates",
    ],
  },
  {
    code: "C-DAP",
    name: "Commercial Digital Applications Development",
    description:
      "Development and delivery of custom digital solutions as consultancy services for Lagos State MDAs and beyond.",
    deliverables: [
      "Client requirement analysis",
      "Custom applications",
      "Revenue generation reports",
    ],
  },
  {
    code: "SLP-P",
    name: "Studio-Based Learning Programme Production",
    description:
      "Production of high-quality learning programmes using DLU studio facilities.",
    deliverables: [
      "Podcast episodes",
      "Video learning content",
      "Engagement metrics",
    ],
  },
];

async function seedResponsibilities(headId: string | null) {
  for (const r of SEED_RESPONSIBILITIES) {
    await prisma.responsibility.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        deliverables: r.deliverables,
        isActive: true,
        createdById: headId,
      },
      update: {
        name: r.name,
        description: r.description,
        deliverables: r.deliverables,
      },
    });
  }
  console.info(
    `[seed] responsibilities upserted: ${SEED_RESPONSIBILITIES.length}`,
  );
}

async function seedSampleActivity(
  headId: string,
  memberId: string,
  respId: string,
) {
  const existing = await prisma.activity.count();
  if (existing > 0) {
    console.info("[seed] activities already present — skipping sample activity");
    return;
  }

  const today = new Date();
  const dateOnly = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  await prisma.activity.create({
    data: {
      title: "Digital Learning Unit — Monthly All-Hands",
      type: "Meeting",
      description: "Seed sample activity for demo",
      createdById: memberId,
      delegatedById: headId,
      startDate: dateOnly,
      endDate: dateOnly,
      startTime: "10:00",
      endTime: "11:30",
      location: "DLU Conference Room",
      responsibilities: {
        create: [{ responsibilityId: respId }],
      },
      dailyLogs: {
        create: [{ date: dateOnly }],
      },
    },
  });
  console.info("[seed] sample activity created");
}

async function main() {
  const password = resolveSeedPassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const roster: SeedUser[] = [HEAD, ...(SEED_DEMO ? DEMO_MEMBERS : [])];

  let headId: string | null = null;
  let firstMemberId: string | null = null;

  for (const s of roster) {
    const u = await upsertUser(s, passwordHash);
    console.info(`[seed] user ${u.username} (${u.role}) id=${u.id}`);
    if (u.role === "head") headId = u.id;
    else if (!firstMemberId) firstMemberId = u.id;
  }

  await seedResponsibilities(headId);

  if (SEED_DEMO && headId && firstMemberId) {
    const resp = await prisma.responsibility.findFirst({
      where: { code: "WPD" },
    });
    if (resp) {
      await seedSampleActivity(headId, firstMemberId, resp.id);
    }
  }

  // Dev-only: document password once (not a shared production constant)
  if (ENABLE_DEV && process.env.NODE_ENV !== "production") {
    console.info(
      `[seed] ENABLE_DEV_LOGIN: seed password set for ${roster.length} user(s).`,
    );
    console.info(
      `[seed] Use DEV_SEED_PASSWORD from .env to sign in (mustChangePassword=true).`,
    );
  } else {
    console.info(
      `[seed] Temporary passwords generated; users must change on first login.`,
    );
    if (process.env.PRINT_SEED_PASSWORD === "true") {
      console.info(`[seed] one-time password: ${password}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
