import { Model, DataTypes } from "sequelize";
import sequelize from "../database";
import { Op } from "sequelize";
import ContactList from "./ContactList";

interface CampaignAttributes {
  id: number;
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: Date;
  companyId: number;
  contactListId: number;
  message: string;
  message1: string;
  message2?: string;
  message3?: string;
  message4?: string;
  message5?: string;
  mediaPath?: string;
  mediaName?: string;
  confirmationMessage1?: string;
  confirmationMessage2?: string;
  confirmationMessage3?: string;
  confirmationMessage4?: string;
  confirmationMessage5?: string;
  createdAt: Date;
  updatedAt: Date;
  contactList?: ContactList;
}

interface CampaignCreationAttributes extends Partial<CampaignAttributes> {
  name: string;
  companyId: number;
}

class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> {
  declare id: number;
  declare name: string;
  declare status: string;
  declare confirmation: boolean;
  declare scheduledAt: Date;
  declare companyId: number;
  declare contactListId: number;
  declare message: string;
  declare message1: string;
  declare message2?: string;
  declare message3?: string;
  declare message4?: string;
  declare message5?: string;
  declare mediaPath?: string;
  declare mediaName?: string;
  declare confirmationMessage1?: string;
  declare confirmationMessage2?: string;
  declare confirmationMessage3?: string;
  declare confirmationMessage4?: string;
  declare confirmationMessage5?: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare contactList?: ContactList;
}

Campaign.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending"
    },
    confirmation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    scheduledAt: {
      type: DataTypes.DATE
    },
    companyId: {
      type: DataTypes.INTEGER,
      references: { model: "Companies", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    contactListId: {
      type: DataTypes.INTEGER,
      references: { model: "ContactLists", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    message: {
      type: DataTypes.TEXT
    },
    message1: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message2: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message3: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message4: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message5: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mediaPath: {
      type: DataTypes.TEXT
    },
    mediaName: {
      type: DataTypes.TEXT
    },
    confirmationMessage1: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmationMessage2: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmationMessage3: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmationMessage4: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmationMessage5: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: "Campaigns"
  }
);

export default Campaign;
