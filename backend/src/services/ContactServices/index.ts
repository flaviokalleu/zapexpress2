import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactListItem from "../../models/ContactListItem";
import { head } from "lodash";
import CheckContactNumber from "../../services/WbotServices/CheckContactNumber";
import { parseISO } from "date-fns";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import XLSX from "xlsx";
import { Op } from "sequelize";

interface ContactData {
  name: string;
  number: string;
  email?: string;
  condominio?: string;
  endereco?: string;
  cargo?: string;
}

// Implementação do serviço ImportContactsService
const ImportContactsService = async (
  file: Express.Multer.File,
  companyId: number
): Promise<ContactListItem[]> => {
  logger.info("ImportContactsService called");

  if (!file) {
    throw new AppError("File is required");
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  if (!data || data.length === 0) {
    throw new AppError("Invalid file data");
  }

  const contacts: ContactListItem[] = [];

  for (const row of data) {
    let name = row.nome || row.name || "";
    let number = row.numero || row.number || row.telefone || row.phone || "";
    let email = row.email || "";
    let condominio = row.condominio || "";
    let endereco = row.endereco || row.endereço || row.address || "";
    let cargo = row.cargo || row.function || row.role || "";

    // Validar e formatar número
    if (!number) continue;
    
    // Remover caracteres não numéricos
    number = number.toString().replace(/[^0-9]/g, "");
    
    // Garantir que o número tenha o formato correto
    if (!number.startsWith("55")) {
      number = `55${number}`;
    }
    
    if (number.length < 12) {
      continue; // Número inválido
    }

    try {
      const [contact] = await ContactListItem.findOrCreate({
        where: { number, companyId },
        defaults: {
          name,
          number,
          email,
          condominio,
          endereco,
          cargo,
          companyId,
          isWhatsappValid: true
        }
      });

      contacts.push(contact);
    } catch (err) {
      logger.error(`Error importing contact: ${err}`);
    }
  }

  return contacts;
};

// Implementação do serviço GetContactVcardService
const GetContactVcardService = async (
  contactId: string,
  companyId: number
): Promise<string> => {
  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("Contact not found");
  }

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.name}`,
    `TEL;TYPE=CELL:${contact.number}`,
    contact.email ? `EMAIL:${contact.email}` : "",
    contact.condominio ? `ORG:${contact.condominio}` : "",
    contact.endereco ? `ADR:;;${contact.endereco};;;` : "",
    contact.cargo ? `TITLE:${contact.cargo}` : "",
    "END:VCARD"
  ].filter(Boolean).join("\r\n");

  return vcard;
};

// Implementação do serviço ListContactsService
interface RequestParams {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
}

interface ResponseParams {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: RequestParams): Promise<ResponseParams> => {
  const limit = 20;
  const offset = (parseInt(pageNumber, 10) - 1) * limit;

  let where: any = { companyId };

  if (searchParam) {
    where = {
      ...where,
      [Op.or]: [
        { name: { [Op.like]: `%${searchParam}%` } },
        { number: { [Op.like]: `%${searchParam}%` } },
        { email: { [Op.like]: `%${searchParam}%` } },
        { condominio: { [Op.like]: `%${searchParam}%` } },
        { endereco: { [Op.like]: `%${searchParam}%` } },
        { cargo: { [Op.like]: `%${searchParam}%` } }
      ]
    };
  }

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export {
  ImportContactsService,
  GetContactVcardService,
  ListContactsService
};
