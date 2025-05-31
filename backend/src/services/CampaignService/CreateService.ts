import Campaign from "../../models/Campaign";
import { Data } from "./interfaces";

const CreateService = async (data: Data): Promise<Campaign> => {
  const record = await Campaign.create({
    name: data.name,
    status: data.status,
    confirmation: data.confirmation,
    scheduledAt: data.scheduledAt,
    companyId: data.companyId,
    contactListId: data.contactListId,
    fileListId: data.fileListId || null,
    body: data.body,
    start: data.start,
    end: data.end,
    whatsappId: data.whatsappId || null
  });

  return record;
};

export default CreateService;
