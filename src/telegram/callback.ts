export default async function callback_hanle(bot: any) {
	await bot.sendMessage(
		bot.makeHtmlCode(JSON.stringify(bot.message, null, 2), "JSON"),
		bot.message.message.chat.id
	);
}
