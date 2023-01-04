import { Request } from "express";
import { prisma } from "../../server";

export const updateUserLocation = async (req: Request, res: any) => {
 // const { id: user_id } = res.locals.user;
  
  const {  user_id, latitude, longitude } = req.body;

  /**
   * To be modyify
   */

  try {
    const user = await prisma.user_location.update({
      where: {
        user: user_id
      },
      data: {
        latitude: latitude,
        longitude: longitude,
      },
    });

    if (!user) throw Error("can not update user");
    res.status(200).send(JSON.stringify(user));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
