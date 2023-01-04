import { Request, Response } from "express";
import { prisma } from "../../server";
import { nft_state as NFT_STATES } from "@prisma/client";

export const updateNFTV2 = async (req: Request, res: Response) => {
  const { id: user_id } = res.locals.user;
  const { meta_mask_id, nft_id } = req.body;

  if (!meta_mask_id || !nft_id)
    return res
      .status(400)
      .send(JSON.stringify({ err: "meta_mask_id or nft_id missing" }));

  try {
    const nft = await prisma.nft.update({
      where: {
        id_user_id: {
          id: parseInt(nft_id),
          user_id: user_id,
        },
      },
      data: {
        meta_mask_id: meta_mask_id,
        nft_state: NFT_STATES.PENDING,
        url: "https://rezafootwear.com",
      },
    });
    const nfts = await prisma.nft.findMany({
      orderBy: {
        created_at: "desc",
      },
      where: {
        user_id: user_id,
      },
    });
    if (!nft) throw Error("Can not update  nft");
    return res.status(200).json(nfts);
  } catch (err) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
export const updateNFT = async (req: Request, res: Response) => {
  const { id: user_id } = res.locals.user;

  const { meta_mask_id, nft_id } = req.body;

  if (!meta_mask_id || !nft_id)
    return res
      .status(400)
      .send(JSON.stringify({ err: "meta_mask_id or nft_id missing" }));

  try {
    const nft = await prisma.nft.update({
      where: {
        id_user_id: {
          id: nft_id,
          user_id: user_id,
        },
      },
      data: {
        meta_mask_id: meta_mask_id,
        nft_state: NFT_STATES.PENDING,
        url: "https://rezafootwear.com",
      },
    });
    if (!nft) throw Error("Can not update  nft");
    return res.status(200).send("nft created");
  } catch (err) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
