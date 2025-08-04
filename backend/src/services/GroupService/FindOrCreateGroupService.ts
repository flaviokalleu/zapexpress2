import Group from "../../models/Group";

interface Request {
  name: string;
  companyId: number;
}

const FindOrCreateGroupService = async ({
  name,
  companyId
}: Request): Promise<Group> => {
  // Buscar grupo existente por nome e companyId
  let group = await Group.findOne({
    where: {
      name: name.trim(),
      companyId
    }
  });

  // Se não existir, criar novo grupo
  if (!group) {
    group = await Group.create({
      name: name.trim(),
      companyId
    });
  }

  return group;
};

export default FindOrCreateGroupService; 