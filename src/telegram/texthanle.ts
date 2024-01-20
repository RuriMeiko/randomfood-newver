import type BotModel from "./core";

export default async function text_hanle(this: BotModel, currentcommand: any) {
	switch (currentcommand.document.command) {
		case "debtcreate":
			console.log(this.message.entities);
			await this.sendMessage("oklun", this.message.chat.id);
			await this.database
				.db("randomfood")
				.collection("command")
				.deleteOne({
					filter: { _id: this.message.from.id },
				});
			return await this.answerCallbackQuery(this.message.id);

		default:
			return await this.answerCallbackQuery(this.message.id);
	}
}
