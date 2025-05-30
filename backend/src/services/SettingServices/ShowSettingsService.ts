import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  settingKey: string;
  companyId: number;
}

const ShowSettingsService = async ({
  settingKey,
  companyId
}: Request): Promise<Setting | null> => {
  const setting = await Setting.findOne({
    where: { key: settingKey, companyId }
  });

  // Não lança erro para system_title, retorna null se não encontrado
  if (!setting && settingKey !== "system_title") {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  return setting;
};

export default ShowSettingsService;