import { cookies } from "next/headers";
import { verifyAuthToken } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) {
    return null;
  }

  const verified = await verifyAuthToken(authToken);
  if (!verified) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, createdAt: true },
  });

  return user;
}

