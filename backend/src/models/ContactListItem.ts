import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import ContactList from "./ContactList";

@Table({ tableName: "ContactListItems" })
class ContactListItem extends Model<ContactListItem> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  number: string;

  @AllowNull(false)
  @Default("")
  @Column
  email: string;

  // Novos campos adicionados
  @AllowNull(true)
  @Default("")
  @Column
  condominio: string;

  @AllowNull(true)
  @Default("")
  @Column
  endereco: string;

  @AllowNull(true)
  @Default("")
  @Column
  cargo: string;

  @Column
  isWhatsappValid: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;
}

export default ContactListItem;
