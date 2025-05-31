import Contact from "../../models/Contact";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";

interface ImportContactsData {
  name: string;
  contacts: Array<{
    name: string;
    number: string;
    email?: string;
    condominio?: string;
    endereco?: string;
    cargo?: string;
  }>;
  companyId: number;
}

const ImportContactsService = async ({
  name,
  contacts,
  companyId
}: ImportContactsData): Promise<ContactList> => {
  const contactList = await ContactList.create({
    name,
    companyId
  });

  const contactsWithListId = contacts.map(contact => ({
    name: contact.name,
    number: contact.number,
    email: contact.email,
    condominio: contact.condominio,
    endereco: contact.endereco,
    cargo: contact.cargo,
    contactListId: contactList.id,
    companyId,
    isWhatsappValid: true
  }));

  await ContactListItem.bulkCreate(contactsWithListId);

  return contactList;
};

export default ImportContactsService;
