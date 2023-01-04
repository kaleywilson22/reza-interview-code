import { Request } from "express";
import { prisma } from "../../server";

export const createLocation = async (req: Request, res: any) => {
  const { user_id, latitude, longitude } = req.body;
  try {
    const location = await prisma.user_location.create({
      data: {
        user: user_id,
        latitude: latitude,
        longitude: longitude,
      },
    });
    if (!location) throw Error("Can not create Location");

    return res.status(200).send(
      JSON.stringify({
        ...location,
      })
    );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
