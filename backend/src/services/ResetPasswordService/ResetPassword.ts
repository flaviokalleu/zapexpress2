import sequelize from "sequelize";
import database from "../../database";
import { hash } from "bcryptjs";

const ResetPassword = async (
  email: string,
  token: string,
  password: string
) => {
  // Log dos parâmetros recebidos (para depuração)
  console.log(`[ResetPassword] Email: ${email}`);
  console.log(`[ResetPassword] Token: ${token}`);
  console.log(`[ResetPassword] Senha em texto puro: ${password}`);

  const { hasResult, data } = await filterUser(email, token);
  if (!hasResult) {
    return { status: 404, message: "Email não encontrado" };
  }

  if (hasResult === true) {
    try {
      const convertPassword: string = await hash(password, 8);
      // Log da senha criptografada
      console.log(`[ResetPassword] Senha criptografada: ${convertPassword}`);

      const { hasResults, datas } = await insertHasPassword(
        email,
        token,
        convertPassword
      );
      if (datas.length === 0) {
        return { status: 404, message: "Token não encontrado" };
      }
      return { status: 200, message: "Senha redefinida com sucesso" }; // Retorno explícito
    } catch (err) {
      console.error("[ResetPassword] Erro:", err);
      return { status: 500, message: "Erro ao redefinir senha" };
    }
  }
};

export default ResetPassword;

const filterUser = async (email: string, token: string) => {
  const sql = `SELECT * FROM "Users" WHERE email = '${email}' AND "resetPassword" != ''`;
  const result = await database.query(sql, {
    type: sequelize.QueryTypes.SELECT
  });
  return { hasResult: result.length > 0, data: result };
};

const insertHasPassword = async (
  email: string,
  token: string,
  convertPassword: string
) => {
  const sqlValida = `SELECT * FROM "Users" WHERE email = '${email}' AND "resetPassword" = '${token}'`;
  const resultado = await database.query(sqlValida, {
    type: sequelize.QueryTypes.SELECT
  });
  const sqls = `UPDATE "Users" SET "passwordHash"= '${convertPassword}' , "resetPassword" = '' WHERE email= '${email}' AND "resetPassword" = '${token}'`;
  const results = await database.query(sqls, {
    type: sequelize.QueryTypes.UPDATE
  });
  return { hasResults: results.length > 0, datas: resultado };
};