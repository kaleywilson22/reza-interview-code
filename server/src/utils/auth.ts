import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import config from "../config/auth.config";

export const getSsoLoginUrl = (
  customerId: number,
  storeHash: string,
  storeUrl: string,
  clientId: any,
  clientSecret: jwt.Secret
) => {
  const dateCreated = Math.round(new Date().getTime() / 1000);
  const payload = {
    iss: clientId,
    iat: dateCreated,
    jti: uuidv4(),
    operation: "customer_login",
    store_hash: storeHash,
    customer_id: customerId,
    redirect_to: "/",
  };
  let token = jwt.sign(payload, clientSecret, { algorithm: "HS256" });
  return `${storeUrl}/login/token/${token}`;
};

export const getShopToken = async (headers: any, request: any) => {
  // Set-Cookie returns several cookies, we only want SHOP_TOKEN
  let shopToken = getCookie(headers.get("Set-Cookie"), "SHOP_TOKEN");

  if (shopToken && typeof shopToken === "string") {
    const { host } = request.headers;

    // OPTIONAL: Set the cookie at TLD to make it accessible on subdomains (embedded checkout)
    shopToken = shopToken + `; Domain=${getDomain(host)}`;
    // In development, don't set a secure shopToken or the browser will ignore it
    if (process.env.NODE_ENV !== "production") {
      shopToken = shopToken.replace(/; Secure/gi, "");
      // console.log('shopToken_replaced', shopToken)
      // SameSite=none can't be set unless the shopToken is Secure
      // bc seems to sometimes send back SameSite=None rather than none so make
      // this case insensitive
      shopToken = shopToken.replace(/; SameSite=none/gi, "; SameSite=lax");
    }
  }
  return shopToken;
};

export const getDomain = (host: string | string[] | undefined) => {
  let url = (
    host?.includes(":") ? host?.slice(0, host.indexOf(":")) : host
  ) as string;
  let regex = new RegExp(/^([a-z]+\:\/{2})?([\w-]+\.[\w-]+\.\w+)$/);
  let domain;

  if (!url) return "";
  let sub = !!url.match(regex);

  if (sub) {
    let split = url ? url.split(".") : "";
    domain = "." + split[split.length - 2] + "." + split[split.length - 1];
  } else {
    domain = url;
  }
  return domain;
};

export const getCookie = (header: string, cookieKey: string) => {
  if (!header) return null;
  const cookies = header.split(/, (?=[^;]+=[^;]+;)/);
  return cookies.find((cookie: string) => cookie.startsWith(`${cookieKey}=`));
};

export const makeToken = (id: number) => {
  return jwt.sign({ id: id }, config.access_secret!, {
    expiresIn: 86400 * 0.25, // 4 hours
  });
};
