import fs from "fs";

import { PrismaClient } from "@prisma/client";

export const createUploadsDirectory = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

export const makePhoneAndEmailTypes = async (prisma: PrismaClient) => {
  const types = ["PRIMARY", "BACKUP", "RESET"];

  types.map((type, index) => {
    addEmailTypes(type, prisma, index);
    addPhoneTypes(type, prisma, index);
  });
};

const addEmailTypes = async (
  type: string,
  prisma: PrismaClient,
  index: any
) => {
  const added = await prisma.email_type.findUnique({
    where: { type: type },
  });
  if (!added) {
    await prisma.email_type.create({
      data: {
        type,
        id: index + 1,
      },
    });
  }
};

const addPhoneTypes = async (
  type: string,
  prisma: PrismaClient,
  index: any
) => {
  const added = await prisma.phone_type.findUnique({
    where: { type: type },
  });
  if (!added) {
    await prisma.phone_type.create({
      data: {
        type,
        id: index + 1,
      },
    });
  }
};
