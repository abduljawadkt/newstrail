import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ProfileForm from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user!.id } });

  return (
    <ProfileForm
      initial={{
        name: dbUser?.name ?? "",
        email: dbUser?.email ?? "",
        phone: dbUser?.phone ?? "",
      }}
    />
  );
}
