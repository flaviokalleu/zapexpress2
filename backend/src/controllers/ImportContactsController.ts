import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import { getRedis } from "../libs/redis";
import { queryCache } from "../libs/queryCache";
import { databaseCircuitBreaker } from "../libs/circuitBreaker";
import AppError from "../errors/AppError";
import Contact from "../models/Contact";
import ContactListItem from "../models/ContactListItem";
import ImportContactsService from "../services/ContactServices/ImportContactsService";

interface ImportFileData {
  name: string;
  contactListId: number;
  companyId: number;
  file: Express.Multer.File;
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, contactListId } = req.body;
  const file = req.file;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    contactListId: Yup.number().required()
  });

  try {
    await schema.validate({ name, contactListId });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  try {
    // Usar circuit breaker para operações de banco de dados
    const contacts = await databaseCircuitBreaker.execute(async () => {
      return await ImportContactsService({
        name,
        contactListId,
        companyId,
        file
      });
    });

    // Invalidar cache relacionado a listas de contatos
    await queryCache.invalidatePattern(`contactList:${contactListId}:*`, companyId);
    await queryCache.invalidate(`contactLists`, companyId);

    const io = getIO();
    io.to(`company-${companyId}-contact`).emit(`company-${companyId}-contact`, {
      action: "create",
      contacts
    });

    return res.status(200).json(contacts);
  } catch (error) {
    throw new AppError(
      error.message || "Error importing contacts. Verify your CSV file."
    );
  }
};

export const validate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { contactListId } = req.params;

  try {
    // Usar circuit breaker para operações de banco de dados
    await databaseCircuitBreaker.execute(async () => {
      // Atualizar status de validação de contatos em lote
      await ContactListItem.update(
        { isWhatsappValid: true },
        { 
          where: { 
            contactListId,
            companyId,
            number: {
              [Op.notLike]: '%@%' // Excluir emails
            }
          } 
        }
      );
    });

    // Invalidar cache relacionado a listas de contatos
    await queryCache.invalidatePattern(`contactList:${contactListId}:*`, companyId);

    const io = getIO();
    io.to(`company-${companyId}-contact`).emit(`company-${companyId}-contactList`, {
      action: "update",
      contactListId: +contactListId
    });

    return res.status(200).json({ message: "Contacts validated successfully" });
  } catch (error) {
    throw new AppError(
      error.message || "Error validating contacts."
    );
  }
};
