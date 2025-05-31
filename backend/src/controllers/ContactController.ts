import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Contact from "../models/Contact";
import ContactListItem from "../models/ContactListItem";
import { head } from "lodash";
import CheckContactNumber from "../services/WbotServices/CheckContactNumber";
import { parseISO } from "date-fns";
import { Op } from "sequelize";
import { 
  ImportContactsService, 
  GetContactVcardService, 
  ListContactsService 
} from "../services/ContactServices";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type ContactData = {
  name: string;
  number: string;
  email?: string;
  condominio?: string;
  endereco?: string;
  cargo?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ contacts, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const contact = await Contact.create({
    ...newContact,
    companyId
  });

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("Contact not found");
  }

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;
  const { contactId } = req.params;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("Contact not found");
  }

  await contact.update(contactData);

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("Contact not found");
  }

  await contact.destroy();

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const upload = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  const contacts = await ImportContactsService(file, companyId);

  return res.status(200).json(contacts);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam } = req.query as IndexQuery;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber: "1",
    companyId
  });

  return res.status(200).json({ contacts, count, hasMore });
};

export const getContactVcard = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const vcard = await GetContactVcardService(contactId, companyId);

  return res.status(200).json({ vcard });
};

export default {
  index,
  store,
  show,
  update,
  remove,
  upload,
  list,
  getContactVcard
};
