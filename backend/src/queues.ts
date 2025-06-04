import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { addSeconds, differenceInSeconds } from "date-fns";
import { isArray, isEmpty, isNil } from "lodash";
import moment from "moment";
import path from "path";
import { Op, QueryTypes } from "sequelize";
import sequelize from "./database";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import formatBody from "./helpers/Mustache";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import { getIO } from "./libs/socket";
import { getWbot } from "./libs/wbot";
import Campaign from "./models/Campaign";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import Company from "./models/Company";
import Contact from "./models/Contact";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import Plan from "./models/Plan";
import Schedule from "./models/Schedule";
import User from "./models/User";
import Whatsapp from "./models/Whatsapp";
import ShowFileService from "./services/FileServices/ShowService";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import { logger } from "./utils/logger";
import { MetricsCollector } from "./utils/MetricsCollector";
import { defaultQueueOptions, MessagePriority, queueConfigs, queueManager } from "./config/queueConfig";

const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;

const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;
const metrics = new MetricsCollector();

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export const userMonitor = new BullQueue("UserMonitor", connection, defaultQueueOptions);
export const queueMonitor = new BullQueue("QueueMonitor", connection, defaultQueueOptions);
export const messageQueue = new BullQueue("MessageQueue", connection, {
  ...defaultQueueOptions,
  limiter: {
    max: queueManager.maxConcurrentJobs,
    duration: 1000
  }
});
export const scheduleMonitor = new BullQueue("ScheduleMonitor", connection, defaultQueueOptions);
export const sendScheduledMessages = new BullQueue(
  "SendScheduledMessages",
  connection,
  defaultQueueOptions
);
export const campaignQueue = new BullQueue("CampaignQueue", connection, {
  ...defaultQueueOptions,
  ...queueConfigs.campaignProcessor
});

async function handleSendMessage(job: any) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp == null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

{/*async function handleVerifyQueue(job) {
  logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp, attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"], where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    }); */}

{/*    companies.map(async c => {
      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {

          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"],
                    include: ["extraInfo"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.to(ticket.status)
                    .to("notification")
                    .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              } else {
                logger.info(`Nenhum atendimento perdido encontrado - Empresa: ${companyId}`);
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}; */}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {

      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
        throw e;
      }

    });
  });
  job.start()
}

async function handleVerifySchedules(job: any) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [{ model: Contact, as: "contact" }]
    });
    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          status: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendMessage",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`Disparo agendado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job: any) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  try {
    const whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", `company${schedule.companyId}`, schedule.mediaPath);
    }

    // 🔥 Adicionando logs para depuração
    console.log("🚀 Agendamento - filePath:", filePath);
    console.log("🚀 Agendamento - schedule.mediaPath:", schedule.mediaPath);
    console.log("🚀 Agendamento - schedule:", schedule);

    await SendMessage(whatsapp, {
      number: schedule.contact.number,
      body: formatBody(schedule.body, schedule.contact),
      mediaPath: filePath || undefined
    });

    await scheduleRecord?.update({
      sentAt: moment().format("YYYY-MM-DD HH:mm"),
      status: "ENVIADA"
    });

    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job: any) {
  /**
   * @todo
   * Implementar filtro de campanhas
   */
  const campaigns: { id: number; scheduledAt: string }[] =
    await sequelize.query(
      `select id, "scheduledAt" from "Campaigns" c
    where "scheduledAt" between now() and now() + '1 hour'::interval and status = 'PROGRAMADA'`,
      { type: QueryTypes.SELECT }
    );

  if (campaigns.length > 0)
    logger.info(`Campanhas encontradas: ${campaigns.length}`);
  
  for (let campaign of campaigns) {
    try {
      const now = moment();
      const scheduledAt = moment(campaign.scheduledAt);
      const delay = scheduledAt.diff(now, "milliseconds");
      logger.info(
        `Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
      );
      campaignQueue.add(
        "ProcessCampaign",
        {
          id: campaign.id,
          delay
        },
        {
          removeOnComplete: true
        }
      );
    } catch (err: any) {
      Sentry.captureException(err);
    }
  }
}

async function getCampaign(id: number) {
  return await Campaign.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isWhatsappValid"],
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: CampaignShipping,
        as: "shipping",
        include: [{ model: ContactListItem, as: "contact" }]
      }
    ]
  });
}

async function getContact(id: number) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email"]
  });
}

async function getSettings(campaign: any) {
  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;
  let variables: any[] = [];

  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = JSON.parse(setting.value);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = JSON.parse(setting.value);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = JSON.parse(setting.value);
    }
    if (setting.key === "variables") {
      variables = JSON.parse(setting.value);
    }
  });

  return {
    messageInterval,
    longerIntervalAfter,
    greaterInterval,
    variables
  };
}

export function parseToMilliseconds(seconds: number) {
  return seconds * 1000;
}

async function sleep(seconds: number) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign: any) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign: any) {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name);
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email);
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number);
  }

  variables.forEach(variable => {
    if (finalMessage.includes(`{${variable.key}}`)) {
      const regex = new RegExp(`{${variable.key}}`, "g");
      finalMessage = finalMessage.replace(regex, variable.value);
    }
  });

  return finalMessage;
}

export function randomValue(min: number, max: number) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign: any) {
  try {
    // Busca a campanha atualizada com a lista de contatos
    const updatedCampaign = await Campaign.findByPk(campaign.id, {
      include: [
        {
          model: ContactList,
          as: "contactList",
          include: [
            {
              model: ContactListItem,
              as: "contacts",
              where: { isWhatsappValid: true }
            }
          ]
        }
      ]
    });

    if (!updatedCampaign) {
      logger.error(`Campanha não encontrada: ${campaign.id}`);
      return;
    }

    const validContacts = updatedCampaign.contactList.contacts.length;
    
    // Conta quantas mensagens foram entregues
    const deliveredCount = await CampaignShipping.count({
      where: {
        campaignId: campaign.id,
        deliveredAt: {
          [Op.not]: null
        }
      }
    });

    // Calcula a taxa de sucesso
    const successRate = validContacts > 0 ? (deliveredCount / validContacts) * 100 : 0;
    
    // Atualiza a taxa de sucesso
    await updatedCampaign.update({ 
      successRate,
      lastDeliveryAt: moment()
    });

    logger.info(`Campanha ${campaign.id}: ${deliveredCount}/${validContacts} mensagens entregues (${successRate.toFixed(2)}%)`);

    // Se todas as mensagens foram entregues, finaliza a campanha
    if (validContacts > 0 && deliveredCount >= validContacts) {
      await updatedCampaign.update({ 
        status: "FINALIZADA", 
        completedAt: moment() 
      });

      logger.info(`Campanha ${campaign.id} finalizada com sucesso`);

      const io = getIO();
      io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
        action: "update",
        record: updatedCampaign
      });
    } 
    // Se a taxa de sucesso for maior que 80% e não houver novas entregas por 10 minutos
    else if (successRate >= 80) {
      const lastDelivery = moment(updatedCampaign.lastDeliveryAt);
      const now = moment();
      const minutesSinceLastDelivery = now.diff(lastDelivery, 'minutes');

      if (minutesSinceLastDelivery >= 10) {
        await updatedCampaign.update({ 
          status: "PARCIALMENTE_CONCLUÍDA",
          completedAt: moment(),
          timeoutAt: moment()
        });

        logger.info(`Campanha ${campaign.id} marcada como parcialmente concluída após ${minutesSinceLastDelivery} minutos sem novas entregas`);

        const io = getIO();
        io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
          action: "update",
          record: updatedCampaign
        });
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`Erro ao verificar finalização da campanha ${campaign.id}: ${err.message}`);
  }
}

function calculateDelay(index: number, baseDelay: Date, longerIntervalAfter: number, greaterInterval: number, messageInterval: number) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval
  } else {
    return diffSeconds * 1000 + messageInterval
  }
}

async function processCampaignInBatches(campaignId: number) {
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) return;

    const { contacts } = campaign.contactList;
    if (!isArray(contacts)) return;

    const batchSize = queueManager.batchSize;
    const totalBatches = Math.ceil(contacts.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, contacts.length);
      const batchContacts = contacts.slice(start, end);

      await campaignQueue.add(
        "processBatch",
        {
          campaignId,
          contacts: batchContacts,
          batchNumber: i,
          totalBatches
        },
        {
          priority: MessagePriority.MEDIUM,
          attempts: queueManager.retryStrategy.maxAttempts,
          backoff: queueManager.retryStrategy.backoff
        }
      );

      logger.info(`Batch ${i + 1}/${totalBatches} added to queue for campaign ${campaignId}`);
    }

    await campaign.update({ status: "EM_ANDAMENTO" });
  } catch (err: any) {
    Sentry.captureException(err);
    metrics.recordError(err);
    logger.error(`Error processing campaign in batches: ${err.message}`);
  }
}

async function handleProcessBatch(job: any) {
  try {
    const { campaignId, contacts, batchNumber, totalBatches } = job.data;
    const campaign = await getCampaign(campaignId);
    const settings = await getSettings(campaign);

    const baseDelay = campaign?.scheduledAt;
    const longerIntervalAfter = settings.longerIntervalAfter;
    const greaterInterval = settings.greaterInterval;
    const messageInterval = settings.messageInterval;

    // Processa os contatos sequencialmente
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const index = batchNumber * queueManager.batchSize + i;
      
      // Calcula o delay baseado no índice e configurações
      const delay = calculateDelay(
        index,
        baseDelay || new Date(),
        longerIntervalAfter,
        greaterInterval,
        messageInterval
      );

      // Adiciona o contato à fila com o delay calculado
      await campaignQueue.add(
        "PrepareContact",
        {
          contactId: contact.id,
          campaignId,
          variables: settings.variables,
          delay
        },
        {
          priority: MessagePriority.MEDIUM,
          removeOnComplete: true
        }
      );

      // Aguarda o intervalo configurado antes de processar o próximo contato
      if (i < contacts.length - 1) {
        const nextDelay = calculateDelay(
          index + 1,
          baseDelay || new Date(),
          longerIntervalAfter,
          greaterInterval,
          messageInterval
        );
        await sleep(nextDelay / 1000); // Converte milissegundos para segundos
      }
    }

    metrics.increment('batches_processed');
    logger.info(`Batch ${batchNumber + 1}/${totalBatches} processed for campaign ${campaignId}`);
  } catch (err: any) {
    Sentry.captureException(err);
    metrics.recordError(err);
    logger.error(`Error processing batch: ${err.message}`);
  }
}

async function handleProcessCampaign(job: any) {
  try {
    const { id }: ProcessCampaignData = job.data;
    await processCampaignInBatches(id);
  } catch (err: any) {
    Sentry.captureException(err);
    metrics.recordError(err);
    logger.error(`Error in handleProcessCampaign: ${err.message}`);
  }
}

let ultima_msg = 0;
async function handlePrepareContact(job: any) {
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    const campaign = await getCampaign(campaignId);
    const contact = await getContact(contactId);

    const campaignShipping: any = {};
    campaignShipping.number = contact?.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;

    const messages = getCampaignValidMessages(campaign);
    if (messages.length) {
      const radomIndex = ultima_msg;
      console.log('ultima_msg:', ultima_msg);
      ultima_msg++;
      if (ultima_msg >= messages.length) {
        ultima_msg = 0;
      }
      const message = getProcessedMessage(
        messages[radomIndex],
        variables,
        contact
      );
      campaignShipping.message = `\u200c ${message}`;
    }

    if (campaign?.confirmation) {
      const confirmationMessages =
        getCampaignValidConfirmationMessages(campaign);
      if (confirmationMessages.length) {
        const radomIndex = randomValue(0, confirmationMessages.length);
        const message = getProcessedMessage(
          confirmationMessages[radomIndex],
          variables,
          contact
        );
        campaignShipping.confirmationMessage = `\u200c ${message}`;
      }
    }

    const [record, created] = await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      },
      defaults: campaignShipping
    });

    if (
      !created &&
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign?.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: nextJob.id });
    }

    await verifyAndFinalizeCampaign(campaign);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
  }
}

async function handleDispatchCampaign(job: any) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    const campaign = await getCampaign(campaignId);
    const wbot = await GetWhatsappWbot(campaign?.whatsapp!);

    if (!wbot) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
      return;
    }

    if (!campaign?.whatsapp) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
      return;
    }

    if (!wbot?.user?.id) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
      return;
    }

    logger.info(
      `Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`
    );

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );

    const chatId = `${campaignShipping?.number}@s.whatsapp.net`;

    let body = campaignShipping?.message;

    if (campaign?.confirmation && campaignShipping?.confirmation === null) {
      body = campaignShipping?.confirmationMessage
    }

    if (!isNil(campaign?.fileListId)) {
      try {
        const publicFolder = path.resolve(__dirname, "..", "public");
        const files = await ShowFileService(campaign?.fileListId!, campaign?.companyId!)
        const folder = path.resolve(publicFolder, `company${campaign?.companyId}`,"fileList", String(files.id))
        for (const [index, file] of files.options.entries()) {
          /*const options = await getMessageOptions(file.path, path.resolve(folder, file.path), file.name);*/

          const options = await getMessageOptions(file.name, path.resolve(folder, file.path), String(campaign?.companyId!), body);
          await wbot.sendMessage(chatId, { ...options });
        };
      } catch (error) {
        logger.info(error);
      }
    }

    if (campaign?.mediaPath) {
            const publicFolder = path.resolve(__dirname, "..", "public");
            const filePath = path.join(publicFolder, `company${campaign?.companyId}`, campaign?.mediaPath);

            console.log("queues.ts -> Body antes de getMessageOptions:", body); // Verifica se o texto está aqui
      
      const options = await getMessageOptions(campaign?.mediaPath!, filePath, String(campaign?.companyId!), body);            
      console.log("Options retornadas:", options); // Verifica se o caption está no options
      
      if (Object.keys(options).length) {
        await wbot.sendMessage(chatId, { ...options });
      }
    }
    else {
      if (campaign?.confirmation && campaignShipping?.confirmation === null) {
        await wbot.sendMessage(chatId, {
          text: body || ""
        });
        await campaignShipping?.update({ confirmationRequestedAt: moment() });
      } else {

        await wbot.sendMessage(chatId, {
          text: body || ""
        });
      }
    }
    await campaignShipping?.update({ deliveredAt: moment() });

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });

    logger.info(
      `Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping?.contact?.name}`
    );
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(err.message);
    console.log(err.stack);
  }
}

async function handleLoginStatus(job: any) {
  const users: { id: number }[] = await sequelize.query(
    `select id from "Users" where "updatedAt" < now() - '5 minutes'::interval and online = true`,
    { type: QueryTypes.SELECT }
  );
  for (let item of users) {
    try {
      const user = await User.findByPk(item.id);
      await user!.update({ online: false });
      logger.info(`Usuário passado para offline: ${item.id}`);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  }
}


  async function handleInvoiceCreate() {
  logger.info("GERENDO RECEITA...");
  const job = new CronJob('*/5 * * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {
    
      const status = c.status;
      const dueDate = c.dueDate; 
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment().format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");
      const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      const dias = moment.duration(diff).asDays();
    
      if(status === true){

      	//logger.info(`EMPRESA: ${c.id} está ATIVA com vencimento em: ${vencimento} | ${dias}`);
      
      	//Verifico se a empresa está a mais de 10 dias sem pagamento
        
        if(dias <= -3){
       
          logger.info(`EMPRESA: ${c.id} está VENCIDA A MAIS DE 3 DIAS... INATIVANDO... ${dias}`);
          c.status = false;
          await c.save(); // Save the updated company record
          logger.info(`EMPRESA: ${c.id} foi INATIVADA.`);
          logger.info(`EMPRESA: ${c.id} Desativando conexões com o WhatsApp...`);
          
          try {
    		const whatsapps = await Whatsapp.findAll({
      		where: {
        		companyId: c.id,
      		},
      			attributes: ['id','status','session'],
    		});

    		for (const whatsapp of whatsapps) {

            	if (whatsapp.session) {
    				await whatsapp.update({ status: "DISCONNECTED", session: "" });
    				const wbot = getWbot(whatsapp.id);
    				await wbot.logout();
                	logger.info(`EMPRESA: ${c.id} teve o WhatsApp ${whatsapp.id} desconectado...`);
  				}
    		}
          
  		  } catch (error) {
    		// Lidar com erros, se houver
    		console.error('Erro ao buscar os IDs de WhatsApp:', error);
    		throw error;
  		  }

        
        }else{ // ELSE if(dias <= -3){
        
          const plan = await Plan.findByPk(c.planId);
        
          const sql = `SELECT * FROM "Invoices" WHERE "companyId" = ${c.id} AND "status" = 'open';`
          const openInvoices = await sequelize.query(sql, { type: QueryTypes.SELECT }) as { id: number, dueDate: Date }[];

          const existingInvoice = openInvoices.find(invoice => moment(invoice.dueDate).format("DD/MM/yyyy") === vencimento);
        
          if (existingInvoice) {
            // Due date already exists, no action needed
            //logger.info(`Fatura Existente`);
        
          } else if (openInvoices.length > 0) {
            const updateSql = `UPDATE "Invoices" SET "dueDate" = '${date}', "updatedAt" = '${timestamp}' WHERE "id" = ${openInvoices[0].id};`;

            await sequelize.query(updateSql, { type: QueryTypes.UPDATE });
        
            logger.info(`Fatura Atualizada ID: ${openInvoices[0].id}`);
        
          } else {
          
            const sql = `INSERT INTO "Invoices" (detail, status, value, "updatedAt", "createdAt", "dueDate", "companyId")
            VALUES ('${plan?.name}', 'open', '${plan?.value}', '${timestamp}', '${timestamp}', '${date}', ${c.id});`

            const invoiceInsert = await sequelize.query(sql, { type: QueryTypes.INSERT });
        
            logger.info(`Fatura Gerada para o cliente: ${c.id}`);

            // Rest of the code for sending email
          }
        
          
        
        
        } // if(dias <= -6){
        

      }else{ // ELSE if(status === true){
      
      	//logger.info(`EMPRESA: ${c.id} está INATIVA`);
      
      }
    
    

    });
  });

  job.start();
}



handleCloseTicketsAutomatic()

handleInvoiceCreate()

export async function startQueueProcess() {
  logger.info("Iniciando processamento de filas");

  messageQueue.process("SendMessage", handleSendMessage);

  scheduleMonitor.process("Verify", handleVerifySchedules);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);

  campaignQueue.process("VerifyCampaigns", handleVerifyCampaigns);

  campaignQueue.process("ProcessCampaign", handleProcessCampaign);

  campaignQueue.process("processBatch", handleProcessBatch);

  campaignQueue.process("PrepareContact", handlePrepareContact);

  campaignQueue.process("DispatchCampaign", handleDispatchCampaign);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);

  //queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);



  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "*/5 * * * * *", key: "verify" },
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaigns",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "* * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "*/20 * * * * *" },
      removeOnComplete: true
    }
  );

  messageQueue.on('completed', (job) => {
    metrics.increment('messages_sent');
    metrics.recordLatency('message_processing', job.processedOn! - job.timestamp);
  });

  messageQueue.on('failed', (job, err) => {
    metrics.increment('messages_failed');
    metrics.recordError(err);
  });

  campaignQueue.on('completed', (job) => {
    metrics.increment('campaign_jobs_completed');
    metrics.recordLatency('campaign_processing', job.processedOn! - job.timestamp);
  });

  campaignQueue.on('failed', (job, err) => {
    metrics.increment('campaign_jobs_failed');
    metrics.recordError(err);
  });
}