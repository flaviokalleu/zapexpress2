import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import { getRedis } from "../libs/redis";
import AppError from "../errors/AppError";

import CreateService from "../services/RateLimitService/CreateService";
import ListService from "../services/RateLimitService/ListService";
import UpdateService from "../services/RateLimitService/UpdateService";
import ShowService from "../services/RateLimitService/ShowService";
import DeleteService from "../services/RateLimitService/DeleteService";

interface RateLimitData {
  name: string;
  max: number;
  duration: number;
  companyId: number;
  type: string;
  resource: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber } = req.query as { searchParam: string, pageNumber: string };

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as RateLimitData;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    max: Yup.number().required().min(1),
    duration: Yup.number().required().min(1000),
    type: Yup.string().required().oneOf(["whatsapp", "contact", "campaign", "global"]),
    resource: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-ratelimit`).emit(`company-${companyId}-ratelimit`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as RateLimitData;
  const { id } = req.params;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    max: Yup.number().required().min(1),
    duration: Yup.number().required().min(1000),
    type: Yup.string().required().oneOf(["whatsapp", "contact", "campaign", "global"]),
    resource: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
  io.to(`company-${companyId}-ratelimit`).emit(`company-${companyId}-ratelimit`, {
    action: "update",
    record
  });

  // Limpar cache de rate limits
  const redis = getRedis();
  await redis.del(`ratelimits:${companyId}`);

  return res.status(200).json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.to(`company-${companyId}-ratelimit`).emit(`company-${companyId}-ratelimit`, {
    action: "delete",
    id
  });

  // Limpar cache de rate limits
  const redis = getRedis();
  await redis.del(`ratelimits:${companyId}`);

  return res.status(200).json({ message: "Rate limit deleted" });
};
