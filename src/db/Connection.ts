import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import '../config/envConfig';

export class Connection {
  static connection: MongoClient | null = null;
  static db: Db;

  static async connect(url: string, options?: MongoClientOptions) {
    if (this.connection != null) {
      return this.connection;
    }

    this.connection = await MongoClient.connect(url, options ?? {});
    this.db = this.connection.db();

    return this.connection;
  }
}
