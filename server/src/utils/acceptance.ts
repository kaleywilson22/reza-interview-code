import { PrismaClient, waitlist } from "@prisma/client";

import { sendMailjetEmail } from "./mail";
import { sendSmsFromTemplate, templates_in_db } from "./twillio";

const prisma = new PrismaClient();

interface options {
  campaign_filter: {
    applied: boolean;
    days_since_last_update: number;
    accepted: boolean;
    reminder_count?: number;
    update_count?: number;
  };
  dry_run: boolean;
  send_sms: boolean;
  sms_short_description: templates_in_db;
  send_mail: boolean;
  mail_template?: number;
}

export const sendAcceptance = async ({
  campaign_filter,
  dry_run = true,
  send_sms = false,
  sms_short_description,
  send_mail = false,
  mail_template,
}: options) => {
  const usersToRemind = await getUsersToMessage(campaign_filter);

  if (dry_run) {
    console.log("Dry Run\n");
    console.log(
      `Campaign filter would send ${send_sms ? "texts," : ""} ${
        send_mail ? "mail," : ""
      } to ${usersToRemind.length} users.\n`
    );
  } else {
    await sendTextsAndEmailsToAllUsersWithDelay(
      usersToRemind,
      send_sms,
      sms_short_description,
      send_mail,
      mail_template
    );
  }
};

const sendTextAndEmail = async (
  user: waitlist,
  send_sms: boolean,
  sms_short_description: templates_in_db,
  send_mail: boolean,
  mail_template?: number
) => {
  const name = user?.name;
  const first_name = name?.split(" ")[0];
  const mail_name = first_name
    ? `${first_name[0].toUpperCase() + first_name.substring(1)}`
    : undefined;

  try {
    if (user.id)
      await prisma.waitlist.update({
        where: {
          id: user.id,
        },
        data: {
          accepted: true,
          accepted_at: new Date(),
        },
      });
  } catch (e) {
    console.log("Error accepting ", user.email);
  }
  if (mail_template && send_mail)
    await sendMailjetEmail(user.email.toLowerCase().trim(), mail_template, {
      name: mail_name || "",
    });

  if (user?.phone && send_sms) {
    await sendSmsFromTemplate(user.phone, sms_short_description, undefined);
  }
};

const getUsersToMessage = async ({
  applied,
  days_since_last_update,
  accepted,
  reminder_count,
  update_count,
}: options["campaign_filter"]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - days_since_last_update);

  const waitlist = await prisma.waitlist.findMany({
    where: {
      applied: applied,
      accepted: accepted,
      application_reminder_count: reminder_count,
      application_update_count: update_count,
      updated_at: {
        lt: yesterday,
      },
    },
  });
  return waitlist;
};

async function sendTextsAndEmailsToAllUsersWithDelay(
  users: waitlist[],
  send_sms: boolean,
  sms_short_description: templates_in_db,
  send_mail: boolean,
  mail_template?: number
) {
  for (const user of users) {
    await sendTextAndEmailWithDelay(
      user,
      send_sms,
      sms_short_description,
      send_mail,
      mail_template
    );
    console.log(`Finished user: ${user.email}`);
  }
}

const sendTextAndEmailWithDelay = async (
  user: waitlist,
  send_sms: boolean,
  sms_short_description: templates_in_db,
  send_mail: boolean,
  mail_template?: number
) => {
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      await sendTextAndEmail(
        user,
        send_sms,
        sms_short_description,
        send_mail,
        mail_template
      );
      resolve();
    }, 15);
  });
};
