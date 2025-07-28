import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import Group from "../models/Group";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const groups = await Group.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

  return res.json(groups);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name } = req.body;

  if (!name) {
    throw new AppError("Nome do grupo é obrigatório");
  }

  const group = await Group.create({
    name,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-group`, {
    action: "create",
    group
  });

  return res.status(200).json(group);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { name } = req.body;
  const { id } = req.params;

  if (!name) {
    throw new AppError("Nome do grupo é obrigatório");
  }

  const group = await Group.findOne({
    where: { id, companyId }
  });

  if (!group) {
    throw new AppError("Grupo não encontrado");
  }

  await group.update({ name });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-group`, {
    action: "update",
    group
  });

  return res.status(200).json(group);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const group = await Group.findOne({
    where: { id, companyId }
  });

  if (!group) {
    throw new AppError("Grupo não encontrado");
  }

  await group.destroy();

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-group`, {
    action: "delete",
    groupId: id
  });

  return res.status(200).json({ message: "Grupo deletado" });
}; 