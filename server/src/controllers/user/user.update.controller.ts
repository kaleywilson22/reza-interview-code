import { Request } from "express";
import { prisma } from "../../server";

export const updateSingleUser = async (req: Request, res: any) => {
  const id = res.locals.user.id;
  const { full_name, city, lyop } = req.body;

  try {
    const user = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        full_name: full_name,
        profile: {
          update: { city: city, lyop: lyop },
        },
      },
    });

    if (!user) throw Error("can not update user");
    res.status(200).send(JSON.stringify(user));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
