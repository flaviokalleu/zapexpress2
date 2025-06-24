import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";

import { Op } from "sequelize"; // Adicione isso no topo do arquivo, junto com os outros imports
import Message from "../models/Message"; // Adicione isso no topo, junto com os outros imports de modelos
import Contact from "../models/Contact"; // Adicione isso no topo, se ainda não estiver
import Queue from "../models/Queue"; // Adicione isso no topo, se ainda não estiver
import User from "../models/User"; // Adicione isso no topo, se ainda não estiver

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketUUIDService from "../services/TicketServices/ShowTicketFromUUIDService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import ListTicketsServiceReport from "../services/TicketServices/ListTicketsServiceReport";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListTicketsServiceKanban from "../services/TicketServices/ListTicketsServiceKanban";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  updatedAt?: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tags: string;
  users: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  whatsappId: string;
  useIntegration: boolean;
  promptId: number;
  integrationId: number;
}

type IndexQueryReport = {
  searchParam: string;
  contactId: string;
  whatsappId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  //lastMessage: string;
  queueIds: string;
  tags: string;
  users: string;
  page: string;
  pageSize: string;
};

type ListTicketsServiceParams = {
  searchParam: string;
  tags: number[];
  users: number[];
  pageNumber: string;
  status: string;
  date: string;
  updatedAt?: string;
  showAll: string;
  userId: number;
  queueIds: number[];
  withUnreadMessages: string;
  companyId: number;
};


// Adicione esta função antes das exportações

export const searchMessages = async (req: Request, res: Response): Promise<Response> => {
  // Nova modificação: Adiciona logs para depurar a entrada da requisição
  console.log("searchMessages chamada com query:", req.query);
  console.log("Usuário autenticado:", req.user);

  try {
    const { searchParam } = req.query as { searchParam: string };
    const { companyId } = req.user;

    // Nova modificação: Loga os parâmetros antes da consulta
    console.log("Buscando tickets com searchParam:", searchParam, "e companyId:", companyId);

    const tickets = await Ticket.findAll({
      where: { companyId },
      include: [
        {
          model: Message,
          as: "messages",
          where: { body: { [Op.iLike]: `%${searchParam}%` } },
          required: true,
        },
        { model: Contact, as: "contact" },
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
      ],
      order: [["updatedAt", "DESC"]],
    });

    // Nova modificação: Loga o resultado antes de retornar
    console.log("Tickets encontrados:", tickets.length);
    return res.status(200).json(tickets);
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err);
    return res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
};


/*export const searchMessages = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { searchParam } = req.query as { searchParam: string };
    const { companyId } = req.user;

    const tickets = await Ticket.findAll({
      where: {
        companyId,
      },
      include: [
        {
          model: Message,
          as: "messages",
          where: {
            body: { [Op.iLike]: `%${searchParam}%` }, // Busca case-insensitive no corpo da mensagem
          },
          required: true, // Só retorna tickets que têm mensagens correspondentes
        },
        { model: Contact, as: "contact" },
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json(tickets);
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err);
    return res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
};*/

/*export const ListTicketsService = async ({
  searchParam,
  tags,
  users,
  pageNumber,
  status,
  date,
  updatedAt,
  showAll,
  userId,
  queueIds,
  withUnreadMessages,
  companyId,
}: ListTicketsServiceParams) => {
  const limit = 10;  // Ou o valor de paginação que você estiver utilizando
  const offset = (parseInt(pageNumber) - 1) * limit;

  // Lógica para buscar tickets, incluindo a pesquisa no campo 'message'
  const whereConditions: any = {
    companyId,
    status,
    ...(searchParam && { message: { [Op.iLike]: `%${searchParam}%` } }), // Pesquisa case-insensitive no campo 'message'
  };

  if (tags.length > 0) {
    whereConditions.tags = { [Op.in]: tags };
  }
  if (users.length > 0) {
    whereConditions.userId = { [Op.in]: users };
  }
  if (queueIds.length > 0) {
    whereConditions.queueId = { [Op.in]: queueIds };
  }
  if (withUnreadMessages === 'true') {
    whereConditions.unreadMessages = { [Op.gt]: 0 };  // Filtra tickets com mensagens não lidas
  }

  // Aplicar filtros de data ou outros, se necessário
  if (date) {
    whereConditions.createdAt = { [Op.gte]: new Date(date) };  // Por exemplo, se quiser filtrar por data
  }

  const { rows: tickets, count } = await Ticket.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['updatedAt', 'DESC']],  // Ordem de atualização
  });

  const hasMore = count > offset + tickets.length;

  return { tickets, count, hasMore };
};*/

/*export const index = async (req: Request, res: Response): Promise<Response> => {
  
  console.log("TicketController.ts: FUNÇÃO INDEX EXECUTADA");
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId,


  });
  return res.status(200).json({ tickets, count, hasMore });
};*/


export const index = async (req: Request, res: Response): Promise<Response> => {
  console.log("TicketController.ts: FUNÇÃO INDEX EXECUTADA");
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId,
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {

  console.log("FUNÇÃO STORE EXECUTADA");

  const { contactId, status, userId, queueId, whatsappId }: TicketData = req.body;
  const { companyId } = req.user;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId,
    queueId,
    whatsappId
  });

  const io = getIO();
  io.to(ticket.status).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket
  });
  return res.status(200).json(ticket);
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {

  console.log("FUNÇÃO KANBAN EXECUTADA");

  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;


  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsServiceKanban({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId

  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {

  console.log("FUNÇÃO SHOW EXECUTADA");

  const { ticketId } = req.params;
  const { companyId } = req.user;

  console.log("VALOR DE ticketId NA FUNÇÃO SHOW:", ticketId); // Novo log para ver o valor

  if (!ticketId || ticketId === "undefined" || isNaN(+ticketId)) {
    console.log("ERRO: ticketId inválido detectado na função SHOW:", ticketId);
    return res.status(400).json({ error: "Ticket ID inválido" });
  }

  const contact = await ShowTicketService(ticketId, companyId);
  return res.status(200).json(contact);
};

export const showFromUUID = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { uuid } = req.params;

  const ticket: Ticket = await ShowTicketUUIDService(uuid);

  return res.status(200).json(ticket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log("FUNÇÃO UPDATE EXECUTADA");

    const { ticketId } = req.params;
    const ticketData: TicketData = req.body;
    const { companyId } = req.user;

    console.log("VALOR DE ticketId NA FUNÇÃO UPDATE:", ticketId); // Novo log
    console.log("DADOS ENVIADOS NA FUNÇÃO UPDATE:", ticketData);  // Novo log

    const result = await UpdateTicketService({
      ticketData,
      ticketId,
      companyId
    });

    if (!result) {
      console.error("UpdateTicketService retornou undefined");
      return res.status(500).json({ 
        error: "Erro interno do servidor - serviço retornou undefined" 
      });
    }

    const { ticket } = result;

    console.log("TICKET RETORNADO POR UPDATE:", ticket); // Novo log
    
    return res.status(200).json(ticket);
  } catch (err) {
    console.error("Erro na função update:", err);
    return res.status(500).json({ 
      error: "Erro interno do servidor", 
      message: err.message 
    });
  }
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {

  console.log("FUNÇÃO REMOVE EXECUTADA");

  const { ticketId } = req.params;
  const { companyId } = req.user;

  await ShowTicketService(ticketId, companyId);

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticketId)
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-notification`)
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};


export const report = async (req: Request, res: Response): Promise<Response> => {

  console.log("FUNÇÃO REPORT EXECUTADA");

  const {
    searchParam,
    contactId,
    whatsappId: whatsappIdsStringified,
    dateFrom,
    dateTo,
    status: statusStringified,
    //lastMessage,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    page: pageNumber,
    pageSize
  } = req.query as IndexQueryReport;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let whatsappIds: string[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let statusIds: string[] = [];


  if (statusStringified) {
    statusIds = JSON.parse(statusStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, totalTickets } = await ListTicketsServiceReport(
    companyId,
    {
      searchParam,
      queueIds,
      tags: tagsIds,
      users: usersIds,
      status: statusIds,
      dateFrom,
      dateTo,
      userId,
      contactId,
      whatsappId: whatsappIds
    },
    +pageNumber,
    +pageSize
  );

  return res.status(200).json({ tickets, totalTickets });
};

export const closeAll = async (req: Request, res: Response): Promise<Response> => {
  
  console.log("FUNÇÃO CLOSEALL EXECUTADA");

  const { companyId } = req.user;
  const { status }: TicketData = req.body;
  const io = getIO();

  const { rows: tickets } = await Ticket.findAndCountAll({
    where: { companyId: companyId, status: status },
    order: [["updatedAt", "DESC"]]
  });

  tickets.forEach(async ticket => {

    await ticket.update({
      status: "closed",
      useIntegration: false,
      promptId: null,
      integrationId: null,
      unreadMessages: 0
    })

    const io = getIO();
    io.to(`${ticket.id}`)
      .to(`company-${companyId}-${ticket.status}`)
      .to(`company-${companyId}-notification`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-notification`)
      .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });

  });

  return res.status(200).json();
};