import Campaign from "../../models/Campaign";
import { CampaignData } from "./interfaces";

const CancelService = async (data: CampaignData): Promise<void> => {
  const { id, companyId } = data;
  
  const record = await Campaign.findOne({
    where: {
      id,
      companyId
    }
  });
  
  if (!record) {
    throw new Error("Campaign not found");
  }
  
  await record.update({
    status: "CANCELADA"
  });
};

export default CancelService;
