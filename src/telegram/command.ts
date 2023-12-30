const botCommands = {
    start: async (bot: any, req: any, args: any) => await bot.start(req, args),
    help: async (bot: any, req: any, args: any) => await bot.help(req, args),
    debt: async (bot: any, req: any, args: any) => await bot.debt(req, args),
    debthistory: async (bot: any, req: any, args: any) => await bot.debthistory(req, args),
    debtcreate: async (bot: any, req: any, args: any) => await bot.debtcreate(req, args),
    debtpay: async (bot: any, req: any, args: any) => await bot.debtpay(req, args),
    debtdelete: async (bot: any, req: any, args: any) => await bot.debtdelete(req, args),
    debthelp: async (bot: any, req: any, args: any) => await bot.debthelp(req, args),
    about: async (bot: any, req: any, args: any) => await bot.about(req, args),
};
export default botCommands;
