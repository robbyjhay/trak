import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { GuestClientPage } from "./client-page";

export default async function GuestAttendancePage() {
  const session = await readSession();
  
  let memberDetails = null;
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { profile: true }
    });
    if (user && user.profile) {
      memberDetails = {
        name: user.profile.name,
        email: user.email || "",
        phone: user.profile.phone || ""
      };
    }
  }
  
  return <GuestClientPage 
    userName={session?.name} 
    isAuthenticated={!!session} 
    memberDetails={memberDetails}
  />;
}
