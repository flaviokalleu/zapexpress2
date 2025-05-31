import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import { getRedis } from "../libs/redis";

interface RateLimitData {
  key: string;
  value: string;
  companyId: number;
}

// Serviços simulados para compatibilidade
const ListService = async ({ companyId }: { companyId: number }) => {
  const redis = getRedis();
  const prefix = `zapexpress:ratelimit:${companyId}:`;
  const keys = await redis.keys(`${prefix}*`);
  
  const settings = [];
  for (const key of keys) {
    const value = await redis.get(key);
    settings.push({
      key: key.replace(prefix, ''),
      value,
      companyId
    });
  }
  
  return settings;
};

const CreateService = async (data: RateLimitData) => {
  const { key, value, companyId } = data;
  const redis = getRedis();
  const prefix = `zapexpress:ratelimit:${companyId}:`;
  
  await redis.set(`${prefix}${key}`, value, 'EX', 86400 * 30); // 30 dias
  
  return {
    key,
    value,
    companyId
  };
};

const DeleteService = async (key: string, companyId: number) => {
  const redis = getRedis();
  const prefix = `zapexpress:ratelimit:${companyId}:`;
  
  await redis.del(`${prefix}${key}`);
  
  return true;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const settings = await ListService({ companyId });

  return res.status(200).json(settings);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as RateLimitData;

  const schema = Yup.object().shape({
    key: Yup.string().required(),
    value: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const setting = await CreateService({
    ...data,
    companyId
  });

  const io = getIO();
  io.emit(`company-${companyId}-rateLimit`, {
    action: "create",
    setting
  });

  return res.status(200).json(setting);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { key } = req.params;

  await DeleteService(key, companyId);

  const io = getIO();
  io.emit(`company-${companyId}-rateLimit`, {
    action: "delete",
    key
  });

  return res.status(200).json({ message: "Rate limit setting deleted" });
};

export default {
  index,
  store,
  remove
};
