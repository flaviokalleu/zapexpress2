import { head } from "lodash";
import XLSX from "xlsx";
import { has } from "lodash";
import ContactListItem from "../../models/ContactListItem";
import CheckContactNumber from "../WbotServices/CheckNumber";
import { logger } from "../../utils/logger";
import FindOrCreateGroupService from "../GroupService/FindOrCreateGroupService";
// import CheckContactNumber from "../WbotServices/CheckNumber";

export async function ImportContacts(
  contactListId: number,
  companyId: number,
  file: Express.Multer.File | undefined
) {
  const workbook = XLSX.readFile(file?.path as string);
  const worksheet = head(Object.values(workbook.Sheets)) as any;
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 0 });
  const contacts = rows.map(row => {
    let name = "";
    let number = "";
    let email = "";
    let groupName = "";

    if (has(row, "nome") || has(row, "Nome")) {
      name = row["nome"] || row["Nome"];
    }

    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número")
    ) {
      number = row["numero"] || row["número"] || row["Numero"] || row["Número"];
      number = `${number}`.replace(/\D/g, "");
    }

    if (
      has(row, "email") ||
      has(row, "e-mail") ||
      has(row, "Email") ||
      has(row, "E-mail")
    ) {
      email = row["email"] || row["e-mail"] || row["Email"] || row["E-mail"];
    }

    // Verificar colunas de grupo
    if (
      has(row, "grupo") ||
      has(row, "Grupo") ||
      has(row, "group") ||
      has(row, "Group")
    ) {
      groupName = row["grupo"] || row["Grupo"] || row["group"] || row["Group"];
    }

    return { name, number, email, groupName, contactListId, companyId };
  });

  const contactList: ContactListItem[] = [];

  for (const contact of contacts) {
    let groupId: number | undefined;

    // Se tem nome de grupo, buscar ou criar o grupo
    if (contact.groupName && contact.groupName.trim()) {
      try {
        const group = await FindOrCreateGroupService({
          name: contact.groupName,
          companyId: contact.companyId
        });
        groupId = group.id;
      } catch (error) {
        logger.error(`Erro ao processar grupo "${contact.groupName}": ${error}`);
      }
    }

    const [newContact, created] = await ContactListItem.findOrCreate({
      where: {
        number: `${contact.number}`,
        contactListId: contact.contactListId,
        companyId: contact.companyId
      },
      defaults: {
        ...contact,
        groupId
      }
    });
    if (created) {
      contactList.push(newContact);
    }
  }

  if (contactList) {
    for (let newContact of contactList) {
      try {
        const response = await CheckContactNumber(newContact.number, companyId);
        newContact.isWhatsappValid = response.exists;
        const number = response.jid.replace(/\D/g, "");
        newContact.number = number;
        await newContact.save();
      } catch (e) {
        logger.error(`Número de contato inválido: ${newContact.number}`);
      }
    }
  }

  return contactList;
}
