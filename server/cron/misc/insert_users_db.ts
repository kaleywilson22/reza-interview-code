import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });
import { PrismaClient, waitlist } from "@prisma/client";

const prisma = new PrismaClient();

const asyncFilter = async (arr: waitlist[], predicate: any) => {
  const results = await Promise.all(arr.map(predicate));

  return arr.filter((_v, index) => results[index]);
};
const main = async () => {
  const waitlist = await prisma.waitlist.findMany({
    where: {
      applied: true,
      accepted: false,
    },
    orderBy: {
      applied_at: "desc",
    },
  });

  const filtered: waitlist[] = await asyncFilter(
    waitlist,
    async (r: waitlist, _index: number) => {
      const user = await prisma.user.findUnique({
        where: {
          email: r.email.toLowerCase().trim(),
        },
      });
      if (!user) {
        return true;
      } else {
        return false;
      }
    }
  );

  console.log(filtered.length);

  await prisma.$transaction(
    filtered.map((waitlist: waitlist, _index) => {
      const email = waitlist.email.toLowerCase().trim();
      const phone = !waitlist.phone ? undefined : waitlist.phone;
      const lyop = waitlist.lyop?.substring(0, 9999);
      return prisma.user.create({
        data: {
          email: email,
          phone: phone,
          full_name: waitlist.name,
          user_category: "DROP_C",
          profile: {
            create: {
              city: waitlist.city,
              display_name: waitlist.name,
              lyop: lyop,
            },
          },
          user_email: {
            create: {
              email: email,
              type: { connect: { type: "PRIMARY" } },
            },
          },
          user_phone: {
            ...(phone
              ? {
                  create: {
                    phone: phone,
                    type: { connect: { type: "PRIMARY" } },
                  },
                }
              : {}),
          },
        },
      });
    })
  );
};

main();
