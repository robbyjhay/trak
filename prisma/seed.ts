import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLAIN_PASSWORD = 'DLUactsys360';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00Z');
  const d2 = new Date(b + 'T00:00:00Z');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

function rand(max: number) {
  return Math.floor(Math.random() * max);
}

let uidN = 1000;
function uid(prefix: string): string {
  return prefix + '_' + uidN++;
}

const USERS_DATA = [
  { id: 'babajide', name: 'Babajide Arulogun', username: 'DLUARU', role: 'head', isSecretary: false, isCorps: false, color: '#8a6a1f', phone: '+234 703 319 8115', designation: 'Head, Digital Learning Unit', gradeLevel: 'GL 14', sex: 'Male', stateOfOrigin: 'Ogun', dateJoined: '2016-03-02' },
  { id: 'benson', name: 'Benson Ogunyemi', username: 'DLUOGU', role: 'member', isSecretary: false, isCorps: false, color: '#12915f', phone: '+234 70 3636 3381', designation: 'Instructional Designer', gradeLevel: 'GL 10', sex: 'Male', stateOfOrigin: 'Oyo', dateJoined: '2019-07-15' },
  { id: 'agbaje', name: 'Agbaje Ibrahim', username: 'DLUIBR', role: 'member', isSecretary: false, isCorps: false, color: '#c1613f', phone: '+234 70 1164 0728', designation: 'LMS Content Officer', gradeLevel: 'GL 09', sex: 'Male', stateOfOrigin: 'Kwara', dateJoined: '2020-01-20' },
  { id: 'rufai', name: 'Rufai Hamzat', username: 'DLUHAM', role: 'member', isSecretary: false, isCorps: false, color: '#1f7fa8', phone: '+234 80 3489 5621', designation: 'Systems & Process Officer', gradeLevel: 'GL 09', sex: 'Male', stateOfOrigin: 'Kano', dateJoined: '2020-09-08' },
  { id: 'busari', name: 'Busari Qudus', username: 'DLUQUD', role: 'member', isSecretary: false, isCorps: false, color: '#5a4413', phone: '+234 81 2388 6412', designation: 'Studio & Production Officer', gradeLevel: 'GL 08', sex: 'Male', stateOfOrigin: 'Lagos', dateJoined: '2021-02-11' },
  { id: 'omolara', name: 'Omolara Olaiya', username: 'DLUOLA', role: 'member', isSecretary: false, isCorps: false, color: '#193b34', phone: '+234 80 3540 9238', designation: 'Virtual Programmes Officer', gradeLevel: 'GL 09', sex: 'Female', stateOfOrigin: 'Ondo', dateJoined: '2020-05-04' },
  { id: 'omolola', name: 'Omolola Ajayi', username: 'DLUAJA', role: 'member', isSecretary: false, isCorps: false, color: '#7a4b1e', phone: '+234 90 2401 2487', designation: 'Training & Curriculum Officer', gradeLevel: 'GL 10', sex: 'Female', stateOfOrigin: 'Osun', dateJoined: '2018-11-19' },
  { id: 'oyindamola', name: 'Oyindamola Adesara', username: 'DLUADE', role: 'member', isSecretary: true, isCorps: false, color: '#c99f2f', phone: '+234 903 999 7601', designation: 'Unit Secretary', gradeLevel: 'GL 08', sex: 'Female', stateOfOrigin: 'Ekiti', dateJoined: '2021-06-01' },
  { id: 'okikiola', name: 'Okikiola Jefferson', username: 'DLUJEF', role: 'member', isSecretary: false, isCorps: true, corpsEnd: '2027-01-15', color: '#3a5a1f', phone: '+234 80 7872 3310', designation: 'NYSC Corps Member (IT/LMS Support)', gradeLevel: '—', sex: 'Male', stateOfOrigin: 'Delta', dateJoined: '2026-01-15' },
];

const RESPONSIBILITIES_DATA = [
  { id: 'r1', code: 'LMS-CP', name: 'LMS Course Production & Digitalisation', description: 'End-to-end conversion of traditional learning materials into engaging, interactive digital course content for the LMS — instructional design, multimedia integration, content structuring, and QA.', deliverables: JSON.stringify(['Digitised course modules', 'SCORM-compliant packages', 'LMS-ready deployments']) },
  { id: 'r2', code: 'VLP-M', name: 'Virtual Learning Programmes Management', description: 'Strategic planning, coordination, and execution of all virtual learning programmes delivered through the PSSDC platform — scheduling, facilitator coordination, enrollment, and experience management.', deliverables: JSON.stringify(['Virtual programme schedules', 'Facilitator onboarding', 'Evaluation reports']) },
  { id: 'r3', code: 'LMS-SO', name: 'LMS Studio Operations', description: 'Management and administration of the DLU production studio — equipment maintenance, resource scheduling, technical support for recordings, optimal studio conditions.', deliverables: JSON.stringify(['Studio resource schedule', 'Equipment maintenance logs', 'Utilisation reports']) },
  { id: 'r4', code: 'WPD', name: 'PSSDC Work Process Digitalisation', description: 'Systematic analysis, redesign, and digital transformation of existing PSSDC work processes — automation opportunities, digital solutions, change management.', deliverables: JSON.stringify(['Digitalised workflow docs', 'Automation solutions', 'Efficiency reports']) },
  { id: 'r5', code: 'WTU', name: 'Website Technical Updates & Management', description: 'Technical administration, maintenance, and continuous improvement of PSSDC\'s web presence — content updates, security patches, performance, troubleshooting.', deliverables: JSON.stringify(['Content updates', 'Security audit reports', 'UX enhancements']) },
  { id: 'r6', code: 'ISTP-D', name: 'Internal Staff Training Programme Development', description: 'Research, design, development, and implementation of training programmes tailored for internal PSSDC staff, delivered through traditional and digital mediums.', deliverables: JSON.stringify(['Training needs assessments', 'Curriculum & syllabi', 'Impact reports']) },
  { id: 'r7', code: 'LSTP-D', name: 'Lagos State Staff Training Programme Development', description: 'Conceptualisation, design, and execution of large-scale training programmes for the broader Lagos State public service workforce, aligned with state priorities across MDAs.', deliverables: JSON.stringify(['State-wide programme designs', 'Stakeholder engagement plans', 'Multi-cohort delivery']) },
  { id: 'r8', code: 'I-DAP', name: 'Internal Digital Applications Development', description: 'Planning, development, testing, and deployment of custom digital applications addressing internal PSSDC operational needs.', deliverables: JSON.stringify(['Requirement specs', 'Deployed applications', 'Maintenance & updates']) },
  { id: 'r9', code: 'C-DAP', name: 'Commercial Digital Applications Development', description: 'Development and delivery of custom digital solutions as consultancy services for clients within Lagos State Public Service and beyond.', deliverables: JSON.stringify(['Client requirement analysis', 'Custom applications', 'Revenue generation reports']) },
  { id: 'r10', code: 'SLP-P', name: 'Studio-Based Learning Programme Production', description: 'Production of high-quality learning programmes using DLU studio facilities — podcasts, video lectures, interactive sessions, multimedia learning content.', deliverables: JSON.stringify(['Podcast episodes', 'Video learning content', 'Engagement metrics']) },
];

const TITLE_POOL = [
  { title: 'LMS Course Production — Onboarding Module', type: 'Task', resp: 'r1' },
  { title: 'SCORM Package QA — Finance Basics', type: 'Task', resp: 'r1' },
  { title: 'Course Content Review — HR Policy Series', type: 'Meeting', resp: 'r1' },
  { title: 'Virtual Cohort 4 — Facilitator Onboarding', type: 'Meeting', resp: 'r2' },
  { title: 'Virtual Learning Enrollment Drive', type: 'Task', resp: 'r2' },
  { title: 'Studio Equipment Maintenance Check', type: 'Task', resp: 'r3' },
  { title: 'Studio Booking Calendar Update', type: 'Task', resp: 'r3' },
  { title: 'PSSDC Workflow Mapping — Leave Requests', type: 'Project', resp: 'r4' },
  { title: 'Process Automation Scoping — Procurement', type: 'Meeting', resp: 'r4' },
  { title: 'Website Homepage Content Refresh', type: 'Task', resp: 'r5' },
  { title: 'Website Security Patch Deployment', type: 'Task', resp: 'r5' },
  { title: 'UX Review — Course Catalogue Page', type: 'Meeting', resp: 'r5' },
  { title: 'Training Needs Assessment — Finance Dept', type: 'Meeting', resp: 'r6' },
  { title: 'Curriculum Design — New Hire Orientation', type: 'Task', resp: 'r6' },
  { title: 'Lagos State MDA Training Cohort — Kickoff', type: 'Program', resp: 'r7' },
  { title: 'State-Wide Training Stakeholder Engagement', type: 'Meeting', resp: 'r7' },
  { title: 'Internal App — Leave Tracker Requirements', type: 'Meeting', resp: 'r8' },
  { title: 'Internal App — Leave Tracker Build Review', type: 'Task', resp: 'r8' },
  { title: 'Consultancy Scoping — MDA Client', type: 'Project', resp: 'r9' },
  { title: 'Video Lecture Production — Ethics Series', type: 'Task', resp: 'r10' },
  { title: 'PSSDC Monthly Management Briefing', type: 'Meeting', resp: 'r4' },
  { title: 'Digital Learning Unit — Monthly All-Hands', type: 'Meeting', resp: 'r4' },
];

const HEAD_USER_ID = 'babajide';

function firstName(name: string): string {
  return name.split(' ')[0];
}

async function main() {
  console.log('🌱 Seeding Trak database...');
  const now = new Date();

  // Clear all data
  await prisma.notification.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.dailyLog.deleteMany();
  await prisma.activityResponsibility.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.communityMessage.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.responsibility.deleteMany();
  await prisma.user.deleteMany();

  // Hash password
  const passwordHash = bcrypt.hashSync(PLAIN_PASSWORD, 10);

  // Create users
  for (const u of USERS_DATA) {
    await prisma.user.create({
      data: { ...u, passwordHash },
    });
  }
  console.log(`  ✅ ${USERS_DATA.length} users created`);

  // Create responsibilities
  for (const r of RESPONSIBILITIES_DATA) {
    await prisma.responsibility.create({ data: r });
  }
  console.log(`  ✅ ${RESPONSIBILITIES_DATA.length} responsibilities created`);

  // Create 70 random historical activities
  const memberIds = USERS_DATA.map(u => u.id);
  let actCount = 0;
  for (let i = 0; i < 70; i++) {
    const person = memberIds[rand(memberIds.length)];
    const pick = TITLE_POOL[rand(TITLE_POOL.length)];
    const daysAgo = rand(63) + 1;
    const date = iso(addDays(now, -daysAgo));
    const actId = uid('act');
    const logId = uid('log');
    const today = iso(now);

    // Determine if we should submit this log
    const shouldSubmit = !(daysAgo <= 1 && Math.random() < 0.5);
    const logStatus = shouldSubmit ? 'submitted' : 'pending';
    const actStatus = shouldSubmit ? 'completed' : (date < today ? 'missed' : 'pending');

    await prisma.activity.create({
      data: {
        id: actId,
        title: pick.title,
        type: pick.type,
        createdById: person,
        startDate: date,
        endDate: date,
        startTime: '09:00',
        endTime: '11:00',
        status: actStatus,
        createdAt: new Date(date + 'T00:00:00Z'),
        responsibilities: {
          create: { responsibilityId: pick.resp },
        },
        dailyLogs: {
          create: {
            id: logId,
            date: date,
            objectives: shouldSubmit ? 'Covered planned agenda for this session.' : '',
            transcript: shouldSubmit ? 'Session ran as scheduled; outcomes logged and shared with the team.' : '',
            attendanceCount: shouldSubmit ? String(rand(20) + 3) : '',
            status: logStatus,
            submittedAt: shouldSubmit ? now : null,
          },
        },
      },
    });

    // Add some comments from Head
    if (shouldSubmit && Math.random() < 0.35 && person !== HEAD_USER_ID) {
      await prisma.comment.create({
        data: {
          id: uid('cm'),
          activityId: actId,
          authorId: HEAD_USER_ID,
          text: 'Nice work — logged and noted.',
          createdAt: new Date(addDays(new Date(date + 'T00:00:00Z'), 1)),
        },
      });
    }
    actCount++;
  }
  console.log(`  ✅ ${actCount} random activities created`);

  // Multi-day flagship activity
  const multiId = uid('act');
  await prisma.activity.create({
    data: {
      id: multiId,
      title: 'Digital Literacy Training — SS2 Batch',
      type: 'Program',
      description: '3-day digital literacy programme.',
      createdById: 'benson',
      startDate: iso(addDays(now, -1)),
      endDate: iso(addDays(now, 1)),
      startTime: '09:00',
      endTime: '13:00',
      location: 'PSSDC ICT Hub, Computer Lab 2',
      status: 'pending',
      createdAt: new Date(iso(addDays(now, -6)) + 'T00:00:00Z'),
      responsibilities: {
        create: [
          { responsibilityId: 'r6' },
          { responsibilityId: 'r1' },
        ],
      },
      dailyLogs: {
        create: [
          {
            id: uid('log'),
            date: iso(addDays(now, -1)),
            objectives: 'Introduce spreadsheet basics; each participant opens and saves a workbook.',
            transcript: 'We started with 34 participants present, walked through opening Excel, naming a sheet, and basic formulas like SUM. Most followed along, five needed one-on-one help with saving files correctly.',
            attendanceCount: '34',
            attendanceNotes: '2 facilitators',
            status: 'submitted',
            submittedAt: now,
          },
          {
            id: uid('log'),
            date: iso(now),
            status: 'pending',
          },
          {
            id: uid('log'),
            date: iso(addDays(now, 1)),
            status: 'pending',
          },
        ],
      },
    },
  });

  // Delegated future activity
  const delId = uid('act');
  await prisma.activity.create({
    data: {
      id: delId,
      title: 'E-Learning Portal Content Upload',
      type: 'Task',
      createdById: 'benson',
      delegatedById: HEAD_USER_ID,
      startDate: iso(addDays(now, 3)),
      endDate: iso(addDays(now, 3)),
      startTime: '09:00',
      status: 'pending',
      createdAt: new Date(iso(addDays(now, -1)) + 'T00:00:00Z'),
      responsibilities: {
        create: { responsibilityId: 'r1' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(addDays(now, 3)),
          status: 'pending',
        },
      },
    },
  });

  // Missed activity
  const missedId = uid('act');
  await prisma.activity.create({
    data: {
      id: missedId,
      title: 'Content Review — July Newsletter',
      type: 'Task',
      createdById: 'benson',
      startDate: iso(addDays(now, -10)),
      endDate: iso(addDays(now, -10)),
      startTime: '10:00',
      status: 'missed',
      createdAt: new Date(iso(addDays(now, -14)) + 'T00:00:00Z'),
      responsibilities: {
        create: { responsibilityId: 'r5' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(addDays(now, -10)),
          status: 'pending',
        },
      },
    },
  });

  // Today's pending activity for benson
  const todayId = uid('act');
  await prisma.activity.create({
    data: {
      id: todayId,
      title: 'Weekly Unit Sync',
      type: 'Meeting',
      createdById: 'benson',
      startDate: iso(now),
      endDate: iso(now),
      startTime: '14:00',
      status: 'pending',
      createdAt: now,
      responsibilities: {
        create: { responsibilityId: 'r4' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(now),
          status: 'pending',
        },
      },
    },
  });

  // Completed activities for other users
  const rev1Id = uid('act');
  await prisma.activity.create({
    data: {
      id: rev1Id,
      title: 'Virtual Cohort 5 — Week 2 Facilitation',
      type: 'Program',
      createdById: 'omolara',
      startDate: iso(now),
      endDate: iso(now),
      startTime: '08:00',
      location: 'Zoom — DLU Virtual Cohorts room',
      status: 'completed',
      initiativeTeamwork: 'Co-facilitator stepped in to handle breakout rooms while I ran the main session, kept things moving without a hitch.',
      challenges: 'A handful of participants had unstable connections and dropped in and out during the second half.',
      outcomes: 'Cohort 5 is now fully caught up with Cohort 4 on the syllabus; ready for the joint assessment next week.',
      nextSteps: 'Share the recording with the participants who dropped off, and confirm the assessment date with the Head.',
      createdAt: now,
      responsibilities: {
        create: { responsibilityId: 'r2' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(now),
          objectives: 'Week 2 facilitation for Cohort 5.',
          transcript: '31 participants, ran smoothly, strong engagement in breakout discussions.',
          attendanceCount: '31',
          status: 'submitted',
          submittedAt: now,
        },
      },
    },
  });

  const rev2Id = uid('act');
  await prisma.activity.create({
    data: {
      id: rev2Id,
      title: 'LMS Onboarding Module — Finance Basics',
      type: 'Task',
      createdById: 'rufai',
      startDate: iso(addDays(now, -1)),
      endDate: iso(addDays(now, -1)),
      startTime: '10:00',
      location: 'Remote — LMS Course Production workspace',
      status: 'completed',
      createdAt: new Date(iso(addDays(now, -1)) + 'T00:00:00Z'),
      responsibilities: {
        create: { responsibilityId: 'r1' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(addDays(now, -1)),
          objectives: 'Finish onboarding module for finance basics course.',
          transcript: 'Module built and QA\'d, exported as SCORM package, ready for LMS upload.',
          status: 'submitted',
          submittedAt: now,
        },
      },
    },
  });

  const rev3Id = uid('act');
  await prisma.activity.create({
    data: {
      id: rev3Id,
      title: 'Studio Podcast Recording — Episode 12',
      type: 'Program',
      createdById: 'busari',
      startDate: iso(addDays(now, -2)),
      endDate: iso(addDays(now, -2)),
      startTime: '13:00',
      status: 'completed',
      createdAt: new Date(iso(addDays(now, -2)) + 'T00:00:00Z'),
      responsibilities: {
        create: { responsibilityId: 'r10' },
      },
      dailyLogs: {
        create: {
          id: uid('log'),
          date: iso(addDays(now, -2)),
          objectives: 'Record episode 12.',
          transcript: 'Recorded and rough-edited, uploaded to shared drive for review.',
          status: 'submitted',
          submittedAt: now,
        },
      },
    },
  });

  // Head's own activities
  const headTitles = ['PSSDC Monthly Management Briefing', 'LMS Studio Equipment Audit', 'Unit Budget Review — Q3'];
  for (let i = 0; i < 3; i++) {
    const type = i === 0 ? 'Meeting' : 'Task';
    const d = i < 2 ? iso(addDays(now, -(3 + i * 4))) : iso(addDays(now, 5));
    const shouldSubmit = i < 2;
    const hActId = uid('act');
    await prisma.activity.create({
      data: {
        id: hActId,
        title: headTitles[i],
        type,
        createdById: HEAD_USER_ID,
        startDate: d,
        endDate: d,
        startTime: '10:00',
        status: shouldSubmit ? 'completed' : 'pending',
        createdAt: new Date(d + 'T00:00:00Z'),
        responsibilities: {
          create: { responsibilityId: i === 0 ? 'r4' : 'r3' },
        },
        dailyLogs: {
          create: {
            id: uid('log'),
            date: d,
            objectives: shouldSubmit ? 'Handled as scheduled.' : '',
            transcript: shouldSubmit ? 'Completed without issues.' : '',
            status: shouldSubmit ? 'submitted' : 'pending',
            submittedAt: shouldSubmit ? now : null,
          },
        },
      },
    });
  }

  // DMs
  const dms = [
    { id: uid('dm'), participantA: 'babajide', participantB: 'benson', fromUserId: HEAD_USER_ID, text: 'Morning Benson — can you circulate the agenda for tomorrow\'s unit sync?', createdAt: new Date(iso(addDays(now, -1)) + 'T08:14:00Z') },
    { id: uid('dm'), participantA: 'babajide', participantB: 'benson', fromUserId: 'benson', text: 'On it, will send before midday.', createdAt: new Date(iso(addDays(now, -1)) + 'T08:20:00Z') },
    { id: uid('dm'), participantA: 'babajide', participantB: 'benson', fromUserId: HEAD_USER_ID, text: 'Also left a comment on your last activity log — nothing major, just a note on the attendance figure.', createdAt: new Date(iso(addDays(now, -1)) + 'T08:22:00Z') },
    { id: uid('dm'), participantA: 'benson', participantB: 'oyindamola', fromUserId: 'oyindamola', text: 'Heads up — studio booking calendar\'s been updated for August.', createdAt: new Date(iso(now) + 'T10:02:00Z') },
    { id: uid('dm'), participantA: 'agbaje', participantB: 'benson', fromUserId: 'agbaje', text: 'Sent you the SCORM export — let me know if it opens fine.', createdAt: new Date(iso(addDays(now, -1)) + 'T14:00:00Z') },
    { id: uid('dm'), participantA: 'benson', participantB: 'rufai', fromUserId: 'rufai', text: 'Thanks for covering my session Tuesday 🙏', createdAt: new Date(iso(addDays(now, -1)) + 'T16:00:00Z') },
  ];
  for (const dm of dms) {
    await prisma.directMessage.create({ data: dm });
  }
  console.log(`  ✅ ${dms.length} DMs created`);

  // Community messages
  const community = [
    { id: uid('cc'), fromUserId: 'oyindamola', text: 'Reminder: studio booking calendar updated for August — please check before scheduling.', createdAt: new Date(iso(now) + 'T08:02:00Z') },
    { id: uid('cc'), fromUserId: 'rufai', text: 'Noted, thanks!', createdAt: new Date(iso(now) + 'T08:05:00Z') },
    { id: uid('cc'), fromUserId: HEAD_USER_ID, text: 'Also — well done everyone on last month\'s completion rate! Keep it up 🎉', createdAt: new Date(iso(now) + 'T08:10:00Z') },
    { id: uid('cc'), fromUserId: 'omolara', text: '🙌', createdAt: new Date(iso(now) + 'T08:11:00Z') },
  ];
  for (const msg of community) {
    await prisma.communityMessage.create({ data: msg });
  }
  console.log(`  ✅ ${community.length} community messages created`);

  // Notifications for missed activities (for Head)
  const missedActivities = await prisma.activity.findMany({
    where: { status: 'missed' },
    include: { createdBy: true },
  });
  for (const a of missedActivities) {
    await prisma.notification.create({
      data: {
        id: uid('nt'),
        userId: HEAD_USER_ID,
        type: 'activity_missed',
        text: `"${a.title}" (${firstName(a.createdBy.name)}) passed its date without being submitted — now marked Missed.`,
        activityId: a.id,
        createdAt: now,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    responsibilities: await prisma.responsibility.count(),
    activities: await prisma.activity.count(),
    dailyLogs: await prisma.dailyLog.count(),
    comments: await prisma.comment.count(),
    dms: await prisma.directMessage.count(),
    community: await prisma.communityMessage.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('\n📊 Final counts:', counts);
  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
