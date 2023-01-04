import { PrismaClient, waitlist } from "@prisma/client";

import { sendMailjetEmail } from "./mail";
import { sendSmsFromTemplate, templates_in_db } from "./twillio";

const prisma = new PrismaClient();

interface options {
  campaign_filter: {
    applied: boolean;
    days_since_last_update: number;
    reminder_count?: number;
    update_count?: number;
    accepted?: boolean;
  };
  dry_run: boolean;
  send_sms: boolean;
  sms_short_description: templates_in_db;
  send_mail: boolean;
  mail_template?: number;
  use_prefix?: boolean;
}

export const sendCampaign = async ({
  campaign_filter,
  dry_run = true,
  send_sms = false,
  sms_short_description,
  send_mail = false,
  mail_template,
  use_prefix = false,
}: options) => {
  const usersToRemind = await getUsersToMessage(campaign_filter);

  if (dry_run) {
    const dry_email = "jack@rezafootwear.com";
    const dry_sms = "+17346787984";

    console.log("Dry Run\n");
    console.log(
      `Campaign filter would send ${send_sms ? "texts," : ""} ${
        send_mail ? "mail," : ""
      } to ${usersToRemind.length} users.\n`
    );

    if (mail_template && send_mail) {
      await sendMailjetEmail(dry_email, mail_template, {
        name: "",
      });
      console.log(`Sent test email to ${dry_email}\n`);
    }
    if (send_sms) {
      await sendSmsFromTemplate(
        dry_sms,
        sms_short_description,
        undefined,
        undefined
      );
      console.log(`Sent test text to ${dry_sms}`);
    }
  } else {
    await sendTextsAndEmailsToAllUsersWithDelay(
      usersToRemind,
      send_sms,
      sms_short_description,
      send_mail,
      mail_template,
      use_prefix
    );
  }
};

const sendTextAndEmail = async (
  user: waitlist,
  send_sms: boolean,
  sms_short_description: templates_in_db,
  send_mail: boolean,
  mail_template?: number,
  use_prefix?: boolean
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
          application_update_count: { increment: 1 },
        },
      });
  } catch (e) {
    console.log("Error incrementing update count for ", user.email);
  }
  if (mail_template && send_mail)
    await sendMailjetEmail(user.email.toLowerCase().trim(), mail_template, {
      name: mail_name || "",
    });

  if (user?.phone && send_sms) {
    let prefix: string | undefined = first_name
      ? `${first_name[0].toUpperCase() + first_name.substring(1)}, `
      : "REZA: ";
    if (use_prefix == false || use_prefix == undefined) {
      prefix = undefined;
    }
    await sendSmsFromTemplate(
      user.phone,
      sms_short_description,
      undefined,
      prefix
    );
  }
};

const getUsersToMessage = async ({
  applied,
  days_since_last_update,
  reminder_count,
  update_count,
  accepted,
}: options["campaign_filter"]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - days_since_last_update);

  const waitlist = await prisma.waitlist.findMany({
    where: {
      applied: applied,
      application_reminder_count: reminder_count,
      application_update_count: update_count,
      accepted: accepted,
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
  mail_template?: number,
  use_prefix?: boolean
) {
  for (const user of users) {
    await sendTextAndEmailWithDelay(
      user,
      send_sms,
      sms_short_description,
      send_mail,
      mail_template,
      use_prefix
    );
    console.log(`Finished user: ${user.email}`);
  }
}

const sendTextAndEmailWithDelay = async (
  user: waitlist,
  send_sms: boolean,
  sms_short_description: templates_in_db,
  send_mail: boolean,
  mail_template?: number,
  use_prefix?: boolean
) => {
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      await sendTextAndEmail(
        user,
        send_sms,
        sms_short_description,
        send_mail,
        mail_template,
        use_prefix
      );
      resolve();
    }, 15);
  });
};
