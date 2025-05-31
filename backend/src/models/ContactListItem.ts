import { Model, DataTypes } from "sequelize";
import sequelize from "../database";

interface ContactListItemAttributes {
  id: number;
  name: string;
  number: string;
  email?: string;
  condominio?: string;
  endereco?: string;
  cargo?: string;
  isWhatsappValid: boolean;
  contactListId: number;
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactListItemCreationAttributes extends Partial<ContactListItemAttributes> {
  name: string;
  number: string;
  companyId: number;
}

class ContactListItem extends Model<ContactListItemAttributes, ContactListItemCreationAttributes> {
  declare id: number;
  declare name: string;
  declare number: string;
  declare email: string | null;
  declare condominio: string | null;
  declare endereco: string | null;
  declare cargo: string | null;
  declare isWhatsappValid: boolean;
  declare contactListId: number;
  declare companyId: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ContactListItem.init(
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
    number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    condominio: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cargo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isWhatsappValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    contactListId: {
      type: DataTypes.INTEGER,
      references: { model: "ContactLists", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
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
    tableName: "ContactListItems",
    indexes: [
      {
        fields: ["number"]
      },
      {
        fields: ["contactListId"]
      }
    ]
  }
);

export default ContactListItem;
