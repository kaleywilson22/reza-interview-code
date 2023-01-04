import axios from "axios";
import "dotenv/config";
/**
 * This file followed https://developers.short.io/docs/cre tutorial pretty closely.
 * I opted to use axios. I just printed the url and also the idString.
 *
 * idString - we may have to use this to delete urls. Not sure if short.io has a limit of urls that can be converted
 *
 * created by Kaley Wilson
 */
export const create_shortlink = async (url: string) => {
  const options = {
    headers: {
      authorization: process.env.SHORT_IO_KEY as string,
    },
  };

  const res = await axios.post(
    "https://api.short.io/links/",
    {
      originalURL: url,
      domain: "enter.www.rezafootwear.com",
    },
    options
  );
  return res.data;
};
