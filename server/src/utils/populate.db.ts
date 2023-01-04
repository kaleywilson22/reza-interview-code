import { PrismaClient } from "@prisma/client";

export const createTestUser = async (prisma: PrismaClient, email: string) => {
  const added = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!added) {
    try {
      await prisma.user.create({
        data: {
          first_name: "Jack",
          last_name: "Krebsbach",
          email: email, //Store primary for quick access
          user_email: {
            create: {
              email: email,
              type: { connect: { id: 1 } },
            },
          },
          profile: {
            create: { city: "Ann Arbor", lyop: "Light Your Own Path" },
          },
        },
      });
      const allUsers = await prisma.user.findUnique({
        where: { email: email },
      });
      console.log(allUsers);
    } catch (e: any) {
      console.log(e);
    }
  }
};
