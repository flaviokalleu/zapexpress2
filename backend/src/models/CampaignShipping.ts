import { Model, DataTypes } from "sequelize";
import sequelize from "../database";
import ContactListItem from "./ContactListItem";
import Campaign from "./Campaign";

interface CampaignShippingAttributes {
  id: number;
  campaignId: number;
  contactListItemId: number;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  jobId: string;
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignShippingCreationAttributes extends Partial<CampaignShippingAttributes> {
  campaignId: number;
  companyId: number;
}

class CampaignShipping extends Model<CampaignShippingAttributes, CampaignShippingCreationAttributes> {
  declare id: number;
  declare campaignId: number;
  declare contactListItemId: number;
  declare total: number;
  declare delivered: number;
  declare pending: number;
  declare failed: number;
  declare jobId: string;
  declare companyId: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

CampaignShipping.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    campaignId: {
      type: DataTypes.INTEGER,
      references: { model: "Campaigns", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    contactListItemId: {
      type: DataTypes.INTEGER,
      references: { model: "ContactListItems", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    total: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    delivered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pending: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    jobId: {
      type: DataTypes.STRING
    },
    companyId: {
      type: DataTypes.INTEGER,
      references: { model: "Companies", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "CampaignShippings"
  }
);

// Definir associações após a inicialização do modelo
CampaignShipping.belongsTo(Campaign, {
  foreignKey: "campaignId",
  as: "campaign"
});

CampaignShipping.belongsTo(ContactListItem, {
  foreignKey: "contactListItemId",
  as: "contact"
});

export default CampaignShipping;
