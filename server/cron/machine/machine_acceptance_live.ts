import { PrismaClient, waitlist } from "@prisma/client";
import * as dotenv from "dotenv";
import { __prod__ } from "../../src/constants";
import {
  create_shortlink,
  makeToken,
  sendMailjetEmail,
  sendMassEmailMailjet,
  sendSmsFromTemplate,
  template_ids,
} from "../../src/utils";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";

import "../../src/utils/date";

dotenv.config({ path: __dirname + "/../.env" });
const prisma = new PrismaClient();

const asyncFilter = async (arr: waitlist[], predicate: any) => {
  const results = await Promise.all(arr.map(predicate));

  return arr.filter((_v, index) => results[index]);
};

async function main() {
  let minus_one_hour = new Date().subtractHours(1);
  minus_one_hour.subtractMinutes(15);
  const waitlist = await prisma.waitlist.findMany({
    where: {
      accepted: false,
      applied: true,
      applied_at: {
        lt: minus_one_hour,
      },
    },
  });

  const emails = waitlist.map((user) => {
    return user.email;
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
  console.log(`Number of Users: ${filtered.length}`);
  const accept_waitlist = prisma.waitlist.updateMany({
    where: {
      email: {
        in: emails,
      },
    },
    data: {
      accepted: true,
      accepted_at: new Date(),
    },
  });

  const new_user_data = filtered.map((waitlist) => {
    const email = waitlist.email.toLowerCase().trim();
    const phone = !waitlist.phone ? undefined : waitlist.phone;
    const lyop = waitlist.lyop?.substring(0, 9999);
    return prisma.user.create({
      data: {
        email: email,
        phone: phone,
        full_name: waitlist?.name,
        user_category: "DROP_FOREVER",
        profile: {
          create: {
            city: waitlist?.city,
            display_name: waitlist?.name,
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
  });
  const [_accepties, ...nu] = await prisma.$transaction([
    accept_waitlist,
    ...new_user_data,
  ]);
  const today = new Date();
  const end_t = new Date(today);
  end_t.setDate(end_t.getDate() + 3);

  const update_reservations = nu.map((nu) => {
    return prisma.reservation.upsert({
      where: {
        user_id: nu?.id,
      },
      create: {
        user: {
          connect: { id: nu?.id },
        },
        start_time: today,
        end_time: end_t,
      },
      update: {
        start_time: today,
        end_time: end_t,
      },
    });
  });

  await prisma.$transaction(update_reservations);

  const messages = nu.map((user, _i) => {
    let portal_link;
    try {
      const token = makeToken(user?.id!);
      portal_link = true
        ? `https://rezafootwear.com/portal?token=${token}`
        : `http://localhost:3000/portal?token=${token}`;
    } catch (e) {
      console.log(e);
    }
    console.log(`Email to: ${user.email}`);
    return {
      To: [{ Email: user.email!, Name: user.full_name }],
      Variables: {
        name: user.full_name,
        portal_link: portal_link || "https://rezafootwear.com/portal",
      },
    };
  });

  const chunkSize = 49;
  let p_mail: any[] = [];
  for (let i = 0, y = 0; i < messages.length; i += chunkSize, y++) {
    const chunk = messages.slice(i, i + chunkSize);
    p_mail[y] = createPromiseFactory(async () => {
      await sendMassEmailMailjet(
        chunk,
        template_ids.machine_acceptance,
        true,
        "MACHINE_ACCEPTANCE"
      );
    }, 200);
  }
  executeSequentially(p_mail);

  const has_phone = nu.filter((user, _index) => {
    return user.phone !== undefined;
  });

  const p_sms = has_phone.map((user, _i) => {
    return createPromiseFactory(async () => {
      if (!user.phone) return;
      let token;
      try {
        if (user.id) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              drop_live_sms: {
                increment: 1,
              },
            },
          });
        }
      } catch (e) {
        console.log(`Error updating ${user.email}`);
      }

      try {
        token = makeToken(user?.id!);
      } catch (e) {
        console.log("invalid token");
      }

      let short_url;
      try {
        const portal_link: string = true
          ? `https://rezafootwear.com/portal?token=${token}`
          : `http://localhost:3000/portal?token=${token}`;

        const phone_short_link = await create_shortlink(portal_link);
        short_url = phone_short_link.shortURL;
      } catch (e) {
        console.log(e);
        console.log(`Could not make shortIO url ${user.email}`);
      }
      return sendSmsFromTemplate(
        user.phone!,
        "APPLICATION_ACCEPTANCE",
        short_url || "https://rezafootwear.com/portal"
      );
    }, 20);
  });
  executeSequentially(p_sms);
  try {
    if (__prod__) {
      await sendMailjetEmail(
        "mustafa@rezafootwear.com",
        template_ids.machine_update,
        {
          process: "Acceptance",
          number_emails: messages.length,
          number_phones: has_phone.length,
        }
      );
      await sendMailjetEmail(
        "jack@rezafootwear.com",
        template_ids.machine_update,
        {
          process: "Acceptance",
          number_emails: messages.length || "None found",
          number_phones: has_phone.length || "None found",
        }
      );
    }
  } catch (e) {
    console.log(e);
  }
}

async function mainWrapper() {
  try {
    main();
  } catch (e) {
    await sendMailjetEmail(
      "jack@rezafootwear.com",
      template_ids.machine_update,
      {
        process: "Acceptance",
        number_emails: "Error occured",
        number_phones: e || "",
      }
    );
  }
}

mainWrapper();
