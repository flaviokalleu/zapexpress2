import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import { queryCache } from "../libs/queryCache";
import { databaseCircuitBreaker } from "../libs/circuitBreaker";
import { metrics } from "../libs/metrics";
import AppError from "../errors/AppError";

import CreateService from "../services/ContactServices/CreateService";
import ListService from "../services/ContactServices/ListService";
import ShowService from "../services/ContactServices/ShowService";
import UpdateService from "../services/ContactServices/UpdateService";
import DeleteService from "../services/ContactServices/DeleteService";

interface ContactData {
  name: string;
  number: string;
  email?: string;
  condominio?: string;
  endereco?: string;
  cargo?: string;
  extraInfo?: any[];
}

interface IndexQuery {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const cacheKey = `contacts:${companyId}:${searchParam || ""}:${pageNumber || 1}`;
  
  // Usar cache para consultas frequentes
  const { records, count, hasMore } = await queryCache.getOrSet(
    cacheKey,
    async () => {
      // Usar circuit breaker para operações de banco de dados
      return await databaseCircuitBreaker.execute(async () => {
        return await ListService({ searchParam, pageNumber, companyId });
      });
    },
    60, // TTL de 1 minuto
    companyId
  );

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const newContact: ContactData = req.body;
  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string().required(),
    email: Yup.string().email().nullable(),
    condominio: Yup.string().nullable(),
    endereco: Yup.string().nullable(),
    cargo: Yup.string().nullable()
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Registrar métricas de uso
  const startTime = Date.now();

  // Usar circuit breaker para operações de banco de dados
  const contact = await databaseCircuitBreaker.execute(async () => {
    return await CreateService({
      ...newContact,
      companyId
    });
  });

  // Invalidar cache relacionado a contatos
  await queryCache.invalidatePattern(`contacts:${companyId}:*`);

  // Registrar tempo de execução
  const executionTime = Date.now() - startTime;
  metrics.emit('operation', { 
    type: 'contact_create', 
    executionTime,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-contact`).emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const cacheKey = `contact:${id}`;
  
  // Usar cache para consultas frequentes
  const contact = await queryCache.getOrSet(
    cacheKey,
    async () => {
      // Usar circuit breaker para operações de banco de dados
      return await databaseCircuitBreaker.execute(async () => {
        return await ShowService(id, companyId);
      });
    },
    300, // TTL de 5 minutos
    companyId
  );

  return res.status(200).json(contact);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string(),
    email: Yup.string().email().nullable(),
    condominio: Yup.string().nullable(),
    endereco: Yup.string().nullable(),
    cargo: Yup.string().nullable()
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  // Usar circuit breaker para operações de banco de dados
  const contact = await databaseCircuitBreaker.execute(async () => {
    return await UpdateService({
      ...contactData,
      id: +id,
      companyId
    });
  });

  // Invalidar cache relacionado ao contato
  await queryCache.invalidate(`contact:${id}`, companyId);
  await queryCache.invalidatePattern(`contacts:${companyId}:*`);

  const io = getIO();
  io.to(`company-${companyId}-contact`).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  // Usar circuit breaker para operações de banco de dados
  await databaseCircuitBreaker.execute(async () => {
    await DeleteService(id, companyId);
  });

  // Invalidar cache relacionado ao contato
  await queryCache.invalidate(`contact:${id}`, companyId);
  await queryCache.invalidatePattern(`contacts:${companyId}:*`);

  const io = getIO();
  io.to(`company-${companyId}-contact`).emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId: +id
  });

  return res.status(200).json({ message: "Contact deleted" });
};
