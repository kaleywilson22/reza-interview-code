import { __prod__ } from "../constants";
import { sendMailjetEmail } from "./mail";
import jwt from "jsonwebtoken";
import config from "../config/auth.config";
import { sendSmsFromTemplate, templates_in_db } from "./twillio";
import { waitlist } from "@prisma/client";
import { create_shortlink } from "./create_short_link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface options {
  reminder_options: {
    applied: boolean;
    days_since_last_update: number;
    reminder_count: number;
  };
  sms_short_description: templates_in_db; // This comes from the DB (table message content)
  //which has the images and messages wanted to remind users
  mail_template: number;
}

export const sendApplicationReminder = async ({
  reminder_options,
  sms_short_description,
  mail_template,
}: options) => {
  const usersToRemind = await getUsersToRemind(reminder_options);
  await sendTextsAndEmailsToAllUsersWithDelay(
    usersToRemind,
    sms_short_description,
    mail_template
  );
};

const sendTextAndEmail = async (
  user: waitlist,
  sms_short_description: templates_in_db,
  mail_template: number
) => {
  const data = await getApplicationAndWaitlistDataByUser(user); //Get application link and waitlist data

  const request = await sendMailjetEmail(
    data.email.toLowerCase().trim(),
    mail_template,
    {
      invited_by: data.invited_by_name ? data.invited_by_name : "",
      application_link_v2: data.application_link_v2,
    }
  );

  const short_link_data = await create_shortlink(data.application_link_v2);

  if (data.phone)
    await sendSmsFromTemplate(
      data.phone,
      sms_short_description,
      short_link_data.shortURL
    );

  //Increment Reminder Count
  if (request.response.ok && data.id) {
    await prisma.waitlist.update({
      where: {
        id: data.id as number,
      },
      data: {
        application_reminder_count: {
          increment: 1,
        },
      },
    });
  }
};

const getUsersToRemind = async ({
  applied,
  days_since_last_update,
  reminder_count,
}: options["reminder_options"]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - days_since_last_update);

  const waitlist = await prisma.waitlist.findMany({
    where: {
      applied: applied,
      application_reminder_count: reminder_count,
      updated_at: {
        lt: yesterday,
      },
    },
  });
  return waitlist;
};

//We get application links and if the user was invited by someone or not
const getApplicationAndWaitlistDataByUser = async (user: waitlist) => {
  const waitlist_token = jwt.sign(
    { w_id: user.id },
    config.signin_secret as string,
    {
      expiresIn: 60 * 60 * 24 * 7, // 1 Week
    }
  );
  const application_link_v2 = __prod__
    ? `https://rezafootwear.com/apply?t=${waitlist_token}`
    : `http://localhost:3000/apply?t=${waitlist_token}`;

  let invited_by_name: string | null | undefined;
  if (user.invited_by) {
    const invite_user = await prisma.user.findUnique({
      where: {
        id: user.invited_by,
      },
      select: {
        full_name: true,
      },
    });
    invited_by_name = invite_user?.full_name;
  }

  return { ...user, invited_by_name, application_link_v2 };
};

async function sendTextsAndEmailsToAllUsersWithDelay(
  users: waitlist[],
  sms_short_description: templates_in_db,
  mail_template: number
) {
  for (const user of users) {
    await sendTextAndEmailWithDelay(user, sms_short_description, mail_template);
    console.log(`Finished user: ${user.email}`);
  }
}

const sendTextAndEmailWithDelay = async (
  user: waitlist,
  sms_short_description: templates_in_db,
  mail_template: number
) => {
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      await sendTextAndEmail(user, sms_short_description, mail_template);
      resolve();
    }, 50); // add delay to make sure rate limits are adhered to
  });
};
