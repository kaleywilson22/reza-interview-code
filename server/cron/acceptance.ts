import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });
import { sendAcceptance } from "../src/utils/acceptance";
import { template_ids } from "../src/utils";

const sms_short_description = "APPLICATION_ACCEPTANCE";
const mail_template = template_ids.acceptance_v2;

sendAcceptance({
  campaign_filter: {
    applied: true,
    days_since_last_update: 1,
    accepted: false,
    reminder_count: undefined,
    update_count: undefined,
  },
  dry_run: false,
  send_sms: true,
  sms_short_description: sms_short_description,
  send_mail: true,
  mail_template: mail_template,
});
