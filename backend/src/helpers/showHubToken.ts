import Setting from "../models/Setting";

export const showHubToken = async (companyId: number): Promise<string | any> => {
  const notificameHubToken = await Setting.findOne({
    where: {
      key: "hubToken",
      companyId: companyId
    }
  });

  if (!notificameHubToken) {
    throw new Error("Erro: Token do Notificame Hub não encontrado.");
  }

  if (notificameHubToken) {
    return notificameHubToken.value;
  }
};