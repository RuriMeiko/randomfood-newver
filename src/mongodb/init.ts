import * as Realm from "realm-web";
import * as utils from "../utils";
const ObjectId = Realm.BSON.ObjectID;
export default class MongoDB {
	private API_MONGO_TOKEN: string;
	private App: Realm.App;
	private mongoClient: any;
	constructor(REALM_APPID: string, API_MONGO_TOKEN: string) {
		this.API_MONGO_TOKEN = API_MONGO_TOKEN;
		this.App = new Realm.App(REALM_APPID);
		this.authenticate(); // Gọi hàm xác thực ngay khi khởi tạo
	}
	private async authenticate() {
		try {
			const credentials = Realm.Credentials.apiKey(this.API_MONGO_TOKEN);
			// Attempt to authenticate
			let user = await this.App.logIn(credentials);
			this.mongoClient = user.mongoClient("mongodb-atlas");
		} catch (err) {
			return utils.toError("Error with authentication.", 500);
		}
	}
	// Thêm getter để lấy đối tượng mongoClient
	async getMongoClient(): Promise<any> {
		// Chờ cho phương thức authenticate hoàn thành trước khi trả về mongoClient
		await this.authenticate();
		return this.mongoClient;
	}
}
