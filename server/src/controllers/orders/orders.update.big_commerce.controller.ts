import { Request, Response } from "express";
import axios from "axios";

const URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v2/orders/`;

export const updateBigCommerceOrder = async (req: Request, res: Response) => {
  try {
    const { shipping, product } = req.body;
    const { id } = req.params;

    const data = await axios.put(
      `${URL}${id}`,
      {
        ...(shipping ? { shipping_addresses: [shipping] } : {}),
        ...(product ? { products: [product] } : {}),
      },
      {
        headers: {
          "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
        },
      }
    );

    return res.status(200).send(data.data);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
