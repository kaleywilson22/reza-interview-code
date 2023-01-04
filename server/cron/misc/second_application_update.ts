import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });
import { sendCampaign } from "../../src/utils/campaign";
import { template_ids } from "../../src/utils";

const sms_short_description = "APPLICATION_UPDATE";
const mail_template = template_ids.acceptance_reminder_two;

sendCampaign({
  campaign_filter: {
    applied: true,
    days_since_last_update: 0,
    reminder_count: undefined,
    update_count: 1,
    accepted: true,
  },
  dry_run: false,
  send_sms: false,
  sms_short_description: sms_short_description,
  send_mail: true,
  mail_template: mail_template,
});
