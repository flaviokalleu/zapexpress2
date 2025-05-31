import { Model, DataTypes } from "sequelize";
import sequelize from "../database";
import ContactListItem from "./ContactListItem";

interface ContactListAttributes {
  id: number;
  name: string;
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
  contacts?: ContactListItem[]; // Adicionando a propriedade contacts
}

interface ContactListCreationAttributes extends Partial<ContactListAttributes> {
  name: string;
  companyId: number;
}

class ContactList extends Model<ContactListAttributes, ContactListCreationAttributes> {
  declare id: number;
  declare name: string;
  declare companyId: number;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare contacts?: ContactListItem[]; // Declarando a propriedade contacts
}

ContactList.init(
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
    tableName: "ContactLists"
  }
);

// Definir associações após a inicialização do modelo
ContactList.hasMany(ContactListItem, {
  foreignKey: "contactListId",
  as: "contacts"
});

export default ContactList;
