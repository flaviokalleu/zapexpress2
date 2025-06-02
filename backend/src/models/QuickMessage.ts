import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";

@Table
class QuickMessage extends Model<QuickMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  shortcode: string;

  @Column
  message: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => Company)
  company: Company;
  
  @Column
  geral: boolean;
  
  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column({
    type: DataType.STRING,
    get() {
      const rawMediaPath = (this as any).getDataValue('mediaPath');
      const rawCompanyId = (this as any).getDataValue('companyId');
      
      if (rawMediaPath && rawCompanyId) {
        return `${process.env.BACKEND_URL}${process.env.PROXY_PORT ?`:${process.env.PROXY_PORT}`:""}/public/company${rawCompanyId}/quick/${rawMediaPath}`;
      }
      return null;
    }
  })
  mediaPath: string | null;
  
  @Column
  mediaName: string;
}

export default QuickMessage;
