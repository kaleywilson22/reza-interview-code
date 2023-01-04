import axios from "axios";
import { Request, Response } from "express";

const API_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v2/orders/`;

export const getBigCommerceOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const shipping_data = await axios.get(
      `${API_URL}${id}/shipping_addresses`,
      {
        headers: {
          "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
        },
      }
    );

    const product_data = await axios.get(`${API_URL}${id}/products`, {
      headers: {
        "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
      },
    });
    const shipping_addresses = [
      shipping_data.data[shipping_data.data.length - 1],
    ];

    res.status(200).json({
      shipping_data: shipping_addresses,
      product_data: product_data.data,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
};
