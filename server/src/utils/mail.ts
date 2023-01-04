import nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/sendmail-transport";

const mailjet = require("node-mailjet").connect(
  process.env.MAIL_JET_API_KEY,
  process.env.MAIL_JET_SECRET_KEY
);

export const sendMail = (mailOptions: MailOptions, callback: any) => {
  let transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "xxxxxxt@gmail.com",
      pass: "xxxxxx",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("mail error: ", error);
      callback(error);
    } else {
      console.error("Message sent: %s", info.messageId);
      callback(null, true);
    }
  });
};

export const sendMailjetEmail = async (
  email: string,
  templateID: number,
  vars?: {},
  dedupe?: boolean,
  campaign?: string
) => {
  try {
    const request = await mailjet.post("send", { version: "v3.1" }).request({
      Globals: {
        ...(!!campaign
          ? { CustomCampaign: campaign, DeduplicateCampaign: dedupe }
          : {}),
        TemplateID: templateID,
        TemplateLanguage: true,
      },
      Messages: [
        {
          From: {
            Email: "community@rezafootwear.com",
            Name: "REZA",
          },
          To: [
            {
              Email: email,
            },
          ],
          Variables: {
            ...vars,
          },
        },
      ],
    });

    return request;
  } catch (e) {
    console.log(e);
  }
};

export const sendMassEmailMailjet = async (
  messages: { To: { Email: string; Name?: string | null }[]; Variables: {} }[],
  templateID: number,
  dedupe: boolean,
  campaign?: string
) => {
  try {
    const request = await mailjet.post("send", { version: "v3.1" }).request({
      Globals: {
        From: {
          Email: "community@rezafootwear.com",
          Name: "REZA",
        },
        TemplateID: templateID,
        TemplateLanguage: true,
        ...(!!campaign
          ? { CustomCampaign: campaign, DeduplicateCampaign: dedupe }
          : {}),
      },
      Messages: messages,
    });
    return request;
  } catch (e) {
    console.log(e);
  }
};

type template_id_type = {
  drop_update: number;
  acceptance_reminder_two: number;
  acceptance: number;
  reset_email: number;
  application_update: number;
  second_application_reminder: number;
  application_reminder: number;
  waitlist_template_v2: number;
  waitlist_template: number;
  form_verification_code: number;
  after_typeform: number;
  drop_live: number;
  after_buy: number;
  drop_reminder_one: number;
  drop_before_live: number;
  high_volume: number;
  did_not_apply: number;
  acceptance_v2: number;
  machine_acceptance: number;
  machine_twenty_four: number;
  machine_three_hours: number;
  machine_closed: number;
  machine_update: number;
  correct: number;
  machine_reactivate: number;
};

export const template_ids: template_id_type = {
  drop_update: 4139024,
  acceptance_reminder_two: 4131665,
  acceptance: 4110765,
  reset_email: 4124076,
  application_update: 4119462,
  second_application_reminder: 4105261,
  application_reminder: 4049539,
  waitlist_template_v2: 3871652,
  waitlist_template: 3799180,
  form_verification_code: 3798290,
  after_typeform: 3874446,
  drop_live: 4141557,
  after_buy: 4141563,
  drop_reminder_one: 4144283,
  drop_before_live: 4144296,
  high_volume: 4149214,
  did_not_apply: 4149347,
  acceptance_v2: 4141557,
  machine_acceptance: 4149250,
  machine_twenty_four: 4146500,
  machine_three_hours: 4151963,
  machine_closed: 4151988,
  machine_update: 4152140,
  correct: 4155039,
  machine_reactivate: 4168927,
};
