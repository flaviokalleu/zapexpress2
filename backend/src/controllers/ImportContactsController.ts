import { Request, Response } from "express";
import * as Yup from "yup";
import { ImportContactsData } from "../services/ContactServices/ImportContactsDataInterface";
import ImportContactsService from "../services/ContactServices/ImportContactsService";

interface ContactData {
  name: string;
  number: string;
  email?: string;
  condominio?: string;
  endereco?: string;
  cargo?: string;
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, contacts } = req.body;

  if (!contacts || !Array.isArray(contacts)) {
    throw new Error("Invalid contacts");
  }

  const contactsData: ContactData[] = contacts;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    contacts: Yup.array()
      .of(
        Yup.object().shape({
          name: Yup.string().required(),
          number: Yup.string().required()
        })
      )
      .required()
  });

  try {
    await schema.validate({ name, contacts });
  } catch (err) {
    throw new Error(err.message);
  }

  // Criar objeto ImportContactsData com name, contacts e companyId
  const importData: ImportContactsData = {
    name,
    contacts: contactsData,
    companyId
  };

  const contactList = await ImportContactsService(importData);

  return res.status(200).json(contactList);
};
