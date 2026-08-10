import type { Responsibility } from "@/lib/types";

export const RESPONSIBILITIES: Responsibility[] = [
  {
    id: "r1",
    code: "LMS-CP",
    name: "LMS Course Production & Digitalisation",
    desc: "End-to-end conversion of traditional learning materials into engaging, interactive digital course content for the LMS — instructional design, multimedia integration, content structuring, and QA.",
    deliverables: [
      "Digitised course modules",
      "SCORM-compliant packages",
      "LMS-ready deployments",
    ],
    isActive: true,
  },
  {
    id: "r2",
    code: "VLP-M",
    name: "Virtual Learning Programmes Management",
    desc: "Strategic planning, coordination, and execution of all virtual learning programmes delivered through the PSSDC platform — scheduling, facilitator coordination, enrollment, and experience management.",
    deliverables: [
      "Virtual programme schedules",
      "Facilitator onboarding",
      "Evaluation reports",
    ],
    isActive: true,
  },
  {
    id: "r3",
    code: "LMS-SO",
    name: "LMS Studio Operations",
    desc: "Management and administration of the DLU production studio — equipment maintenance, resource scheduling, technical support for recordings, optimal studio conditions.",
    deliverables: [
      "Studio resource schedule",
      "Equipment maintenance logs",
      "Utilisation reports",
    ],
    isActive: true,
  },
  {
    id: "r4",
    code: "WPD",
    name: "PSSDC Work Process Digitalisation",
    desc: "Systematic analysis, redesign, and digital transformation of existing PSSDC work processes — automation opportunities, digital solutions, change management.",
    deliverables: [
      "Digitalised workflow docs",
      "Automation solutions",
      "Efficiency reports",
    ],
    isActive: true,
  },
  {
    id: "r5",
    code: "WTU",
    name: "Website Technical Updates & Management",
    desc: "Technical administration, maintenance, and continuous improvement of PSSDC's web presence — content updates, security patches, performance, troubleshooting.",
    deliverables: [
      "Content updates",
      "Security audit reports",
      "UX enhancements",
    ],
    isActive: true,
  },
  {
    id: "r6",
    code: "ISTP-D",
    name: "Internal Staff Training Programme Development",
    desc: "Research, design, development, and implementation of training programmes tailored for internal PSSDC staff, delivered through traditional and digital mediums.",
    deliverables: [
      "Training needs assessments",
      "Curriculum & syllabi",
      "Impact reports",
    ],
    isActive: true,
  },
  {
    id: "r7",
    code: "LSTP-D",
    name: "Lagos State Staff Training Programme Development",
    desc: "Conceptualisation, design, and execution of large-scale training programmes for the broader Lagos State public service workforce, aligned with state priorities across MDAs.",
    deliverables: [
      "State-wide programme designs",
      "Stakeholder engagement plans",
      "Multi-cohort delivery",
    ],
    isActive: true,
  },
  {
    id: "r8",
    code: "I-DAP",
    name: "Internal Digital Applications Development",
    desc: "Planning, development, testing, and deployment of custom digital applications addressing internal PSSDC operational needs.",
    deliverables: [
      "Requirement specs",
      "Deployed applications",
      "Maintenance & updates",
    ],
    isActive: true,
  },
  {
    id: "r9",
    code: "C-DAP",
    name: "Commercial Digital Applications Development",
    desc: "Development and delivery of custom digital solutions as consultancy services for clients within Lagos State Public Service and beyond.",
    deliverables: [
      "Client requirement analysis",
      "Custom applications",
      "Revenue generation reports",
    ],
    isActive: true,
  },
  {
    id: "r10",
    code: "SLP-P",
    name: "Studio-Based Learning Programme Production",
    desc: "Production of high-quality learning programmes using DLU studio facilities — podcasts, video lectures, interactive sessions, multimedia learning content.",
    deliverables: [
      "Podcast episodes",
      "Video learning content",
      "Engagement metrics",
    ],
    isActive: true,
  },
];

export const RESP = Object.fromEntries(
  RESPONSIBILITIES.map((r) => [r.id, r]),
) as Record<string, Responsibility>;
