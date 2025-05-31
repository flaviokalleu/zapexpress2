import Campaign from "../../models/Campaign";

const FindService = async (id: string): Promise<Campaign> => {
  const record = await Campaign.findByPk(id);
  
  if (!record) {
    throw new Error("Campaign not found");
  }
  
  return record;
};

export default FindService;
