import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";

import { logger } from "../../utils/logger"; // Adiciona importação do logger

interface TicketData {
  status?: string;
  companyId?: number;
  unreadMessages?: number;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  groupContact?: Contact
): Promise<Ticket> => {

  // Log inicial: início do processamento
  logger.info({
    event: "find_or_create_ticket_start",
    contactId: groupContact ? groupContact.id : contact.id,
    contactNumber: contact.number,
    whatsappId,
    companyId,
    unreadMessages,
    isGroup: !!groupContact,
  }, `Iniciando busca/criação de ticket para contato ${contact.number} com WhatsApp ID ${whatsappId}`);

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "closed"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      companyId,
      whatsappId
    },
    order: [["id", "DESC"]]
  });

  if (ticket) {

    // Log: ticket encontrado na primeira busca
    logger.info({
      event: "ticket_found_first_search",
      ticketId: ticket.id,
      contactId: ticket.contactId,
      whatsappId: ticket.whatsappId,
      status: ticket.status,
      unreadMessages,
    }, `Ticket ${ticket.id} encontrado na primeira busca com WhatsApp ID ${ticket.whatsappId}`);

    await ticket.update({ unreadMessages, whatsappId });

    // Log: ticket atualizado na primeira busca
    logger.info({
      event: "ticket_updated_first_search",
      ticketId: ticket.id,
      contactId: ticket.contactId,
      whatsappId,
      status: ticket.status,
      unreadMessages,
    }, `Ticket ${ticket.id} atualizado com WhatsApp ID ${whatsappId}`);
  }
  
  if (ticket?.status === "closed") {
    await ticket.update({ queueId: null, userId: null });

    // Log: ticket fechado reaberto
    logger.info({
      event: "ticket_closed_reopened",
      ticketId: ticket.id,
      contactId: ticket.contactId,
      whatsappId: ticket.whatsappId,
      status: "pending",
    }, `Ticket ${ticket.id} fechado foi reaberto`);
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        companyId,
        whatsappId
      });

      // Log: ticket encontrado e atualizado para grupo
      logger.info({
        event: "ticket_found_updated_group",
        ticketId: ticket.id,
        contactId: ticket.contactId,
        whatsappId,
        status: "pending",
        unreadMessages,
      }, `Ticket ${ticket.id} encontrado e atualizado para grupo com WhatsApp ID ${whatsappId}`);


      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId,
        userId: ticket.userId
      });
    }
    const msgIsGroupBlock = await Setting.findOne({
      where: { key: "timeCreateNewTicket" }
    });
  
    const value = msgIsGroupBlock ? parseInt(msgIsGroupBlock.value, 10) : 7200;
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {

      // Log: ticket encontrado na busca de 2 horas
      logger.info({
        event: "ticket_found_recent",
        ticketId: ticket.id,
        contactId: ticket.contactId,
        oldWhatsappId: ticket.whatsappId,
        newWhatsappId: whatsappId,
        status: ticket.status,
      }, `Ticket ${ticket.id} encontrado na busca recente com WhatsApp ID antigo ${ticket.whatsappId}`);


      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        companyId,
        whatsappId
      });

      // Log: ticket atualizado na busca de 2 horas
      logger.info({
        event: "ticket_updated_recent",
        ticketId: ticket.id,
        contactId: ticket.contactId,
        whatsappId,
        status: "pending",
        unreadMessages,
      }, `Ticket ${ticket.id} atualizado com WhatsApp ID ${whatsappId}`);


      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId,
        userId: ticket.userId
      });
    }
  }
  
    const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId }
  });

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      whatsapp,
      companyId
    });

    // Log: novo ticket criado
    logger.info({
      event: "ticket_created",
      ticketId: ticket.id,
      contactId: ticket.contactId,
      whatsappId,
      status: ticket.status,
      unreadMessages,
      companyId,
    }, `Novo ticket ${ticket.id} criado para contato ${contact.number} com WhatsApp ID ${whatsappId}`);


    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId,
      userId: ticket.userId
    });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  // Log final: ticket retornado
  logger.info({
    event: "ticket_returned",
    ticketId: ticket.id,
    contactId: ticket.contactId,
    whatsappId: ticket.whatsappId,
    status: ticket.status,
    unreadMessages: ticket.unreadMessages,
    companyId,
  }, `Ticket ${ticket.id} retornado com WhatsApp ID ${ticket.whatsappId}`);

  return ticket;
};

export default FindOrCreateTicketService;