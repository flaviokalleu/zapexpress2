import Campaign from "../../models/Campaign";
import { Data } from "./interfaces";

const UpdateService = async (data: Data): Promise<Campaign> => {
  const { id } = data;
  
  const record = await Campaign.findByPk(id);
  
  if (!record) {
    throw new Error("Campaign not found");
  }
  
  await record.update({
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

export default UpdateService;
