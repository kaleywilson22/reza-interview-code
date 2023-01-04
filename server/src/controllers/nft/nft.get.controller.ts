import { Request, Response } from "express";
import { prisma } from "../../server";

export const getNFT = async (_req: Request, res: Response) => {
  const { id } = res.locals.user;
  try {
    const nft = await prisma.nft.findMany({
      orderBy: {
        created_at: "desc",
      },
      where: {
        user_id: id,
      },
    });

    if (!nft) throw Error("Can not find user's nft");
    return res.status(200).send(JSON.stringify(nft));
  } catch (err) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
