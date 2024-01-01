// build/index.mjs
function toJSON(data, status = 200) {
  let body = JSON.stringify(data, null, 2);
  let headers = { "content-type": "application/json" };
  return new Response(body, { headers, status });
}
function toError(error, status = 400) {
  return toJSON({ error }, status);
}
var supportedLanguages = [
  "Markup",
  "CSS",
  "C-like",
  "Regex",
  "JavaScript",
  "ABAP",
  "ABNF",
  "ActionScript",
  "Ada",
  "Agda",
  "AL",
  "ANTLR4",
  "Apache Configuration",
  "SQL",
  "Apex",
  "APL",
  "AppleScript",
  "AQL",
  "C",
  "C++",
  "Arduino",
  "ARFF",
  "ARM Assembly",
  "Bash",
  "YAML",
  "Markdown",
  "Arturo",
  "AsciiDoc",
  "C#",
  "ASP.NET (C#)",
  "6502 Assembly",
  "Atmel AVR Assembly",
  "AutoHotkey",
  "AutoIt",
  "AviSynth",
  "Avro IDL",
  "AWK",
  "BASIC",
  "Batch",
  "BBcode",
  "BBj",
  "Bicep",
  "Birb",
  "Bison",
  "BNF",
  "BQN",
  "Brainfuck",
  "BrightScript",
  "Bro",
  "CFScript",
  "ChaiScript",
  "CIL",
  "Cilk/C",
  "Cilk/C++",
  "Clojure",
  "CMake",
  "COBOL",
  "CoffeeScript",
  "Concurnas",
  "Content-Security-Policy",
  "Cooklang",
  "Ruby",
  "Crystal",
  "CSV",
  "CUE",
  "Cypher",
  "D",
  "Dart",
  "DataWeave",
  "DAX",
  "Dhall",
  "Diff",
  "Markup templating",
  "Django/Jinja2",
  "DNS zone file",
  "Docker",
  "DOT (Graphviz)",
  "EBNF",
  "EditorConfig",
  "Eiffel",
  "EJS",
  "Elixir",
  "Elm",
  "Lua",
  "Embedded Lua templating",
  "ERB",
  "Erlang",
  "Excel Formula",
  "F#",
  "Factor",
  "False",
  "Firestore security rules",
  "Flow",
  "Fortran",
  "FreeMarker Template Language",
  "GameMaker Language",
  "GAP (CAS)",
  "G-code",
  "GDScript",
  "GEDCOM",
  "gettext",
  "Git",
  "GLSL",
  "GN",
  "GNU Linker Script",
  "Go",
  "Go module",
  "Gradle",
  "GraphQL",
  "Groovy",
  "Less",
  "Sass (SCSS)",
  "Textile",
  "Haml",
  "Handlebars",
  "Haskell",
  "Haxe",
  "HCL",
  "HLSL",
  "Hoon",
  "HTTP Public-Key-Pins",
  "HTTP Strict-Transport-Security",
  "JSON",
  "URI",
  "HTTP",
  "IchigoJam",
  "Icon",
  "ICU Message Format",
  "Idris",
  ".ignore",
  "Inform 7",
  "Ini",
  "Io",
  "J",
  "Java",
  "Scala",
  "PHP",
  "JavaDoc-like",
  "JavaDoc",
  "Java stack trace",
  "Jolie",
  "JQ",
  "TypeScript",
  "JSDoc",
  "N4JS",
  "JSON5",
  "JSONP",
  "JS stack trace",
  "Julia",
  "Keepalived Configure",
  "Keyman",
  "Kotlin",
  "Kusto",
  "LaTeX",
  "Latte",
  "Scheme",
  "LilyPond",
  "Liquid",
  "Lisp",
  "LiveScript",
  "LLVM IR",
  "Log file",
  "LOLCODE",
  "Magma (CAS)",
  "Makefile",
  "Mata",
  "MATLAB",
  "MAXScript",
  "MEL",
  "Mermaid",
  "METAFONT",
  "Mizar",
  "MongoDB",
  "Monkey",
  "MoonScript",
  "N1QL",
  "Nand To Tetris HDL",
  "Naninovel Script",
  "NASM",
  "NEON",
  "Nevod",
  "nginx",
  "Nim",
  "Nix",
  "NSIS",
  "Objective-C",
  "OCaml",
  "Odin",
  "OpenCL",
  "OpenQasm",
  "Oz",
  "PARI/GP",
  "Parser",
  "Pascal",
  "Pascaligo",
  "PATROL Scripting Language",
  "PC-Axis",
  "PeopleCode",
  "Perl",
  "PHPDoc",
  "PlantUML",
  "PL/SQL",
  "PowerQuery",
  "PowerShell",
  "Processing",
  "Prolog",
  "PromQL",
  ".properties",
  "Protocol Buffers",
  "Stylus",
  "Twig",
  "Pug",
  "Puppet",
  "PureBasic",
  "Python",
  "Q#",
  "Q (kdb+ database)",
  "QML",
  "Qore",
  "R",
  "Racket",
  "Razor C#",
  "React JSX",
  "React TSX",
  "Reason",
  "Rego",
  "Ren'py",
  "ReScript",
  "reST (reStructuredText)",
  "Rip",
  "Roboconf",
  "Robot Framework",
  "Rust",
  "SAS",
  "Sass (Sass)",
  "Shell session",
  "Smali",
  "Smalltalk",
  "Smarty",
  "SML",
  "Solidity (Ethereum)",
  "Solution file",
  "Soy (Closure Template)",
  "Splunk SPL",
  "SQF: Status Quo Function (Arma 3)",
  "Squirrel",
  "Stan",
  "Stata Ado",
  "Structured Text (IEC 61131-3)",
  "SuperCollider",
  "Swift",
  "Systemd configuration file",
  "T4 templating",
  "T4 Text Templates (C#)",
  "VB.Net",
  "T4 Text Templates (VB)",
  "TAP",
  "Tcl",
  "Template Toolkit 2",
  "TOML",
  "Tremor",
  "TypoScript",
  "UnrealScript",
  "UO Razor Script",
  "V",
  "Vala",
  "Velocity",
  "Verilog",
  "VHDL",
  "vim",
  "Visual Basic",
  "WarpScript",
  "WebAssembly",
  "Web IDL",
  "WGSL",
  "Wiki markup",
  "Wolfram language",
  "Wren",
  "Xeora",
  "Xojo (REALbasic)",
  "XQuery",
  "YANG",
  "Zig"
];
var date_luv = /* @__PURE__ */ new Date("2023-10-24T19:00:00+07:00");
var anniversary_default = date_luv;
var BotModel = class {
  constructor(config) {
    this.token = config.token;
    this.commands = config.commands;
    this.url = "https://api.telegram.org/bot" + this.token;
    this.database = config.database;
  }
  async update(request) {
    try {
      this.message = request.content.message;
      if (this.message.hasOwnProperty("text")) {
        if (!await this.executeCommand(request)) {
        }
      } else if (this.message.hasOwnProperty("photo")) {
        console.log(this.message.photo);
      } else if (this.message.hasOwnProperty("video")) {
        console.log(this.message.video);
      } else if (this.message.hasOwnProperty("animation")) {
        console.log(this.message.animation);
      } else if (this.message.hasOwnProperty("locaiton")) {
        console.log(this.message.locaiton);
      } else if (this.message.hasOwnProperty("poll")) {
        console.log(this.message.poll);
      } else if (this.message.hasOwnProperty("contact")) {
        console.log(this.message.contact);
      } else if (this.message.hasOwnProperty("dice")) {
        console.log(this.message.dice);
      } else if (this.message.hasOwnProperty("sticker")) {
        console.log(this.message.sticker);
      } else if (this.message.hasOwnProperty("reply_to_message")) {
        console.log(this.message.reply_to_message);
      } else if (this.message.hasOwnProperty("callback_query")) {
        console.log(this.message.callback_query);
      } else {
        console.log(this.message);
      }
    } catch (error) {
      console.error(error);
      return toError(error.message);
    }
    return toJSON("OK");
  }
  escapeHtml(str) {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return str.replace(/[&<>"']/g, (match) => escapeMap[match]);
  }
  makeHtmlCode(str, language) {
    if (!supportedLanguages.includes(language)) {
      return `<pre>${this.escapeHtml(str)}</pre>`;
    }
    return `<pre><code class="language-${language}">${this.escapeHtml(str)}</code></pre>`;
  }
  async executeCommand(req) {
    let cmdArray = this.message.text.split(" ");
    const command = cmdArray.shift();
    const isCommand = Object.keys(this.commands).includes(command);
    if (isCommand) {
      await this.commands[command](this, req, cmdArray);
      return true;
    }
    return false;
  }
  async sendMessage(text, chatId, inline_keyboard = void 0, parse_mode = "HTML") {
    const base_url = `${this.url}/sendMessage`;
    const params = new URLSearchParams({
      chat_id: chatId.toString(),
      text,
      parse_mode
    });
    if (inline_keyboard) {
      const keyboard = JSON.stringify({ inline_keyboard });
      params.set("reply_markup", keyboard);
    }
    const url = `${base_url}?${params.toString()}`;
    const response = await fetch(url).then((resp) => resp.json());
    return response;
  }
  async editMessage(text, chatId, messageId, inline_keyboard = void 0, parse_mode = "HTML") {
    const base_url = `${this.url}/editMessageText`;
    const params = new URLSearchParams({
      chat_id: chatId.toString(),
      message_id: messageId.toString(),
      text,
      parse_mode
    });
    if (inline_keyboard) {
      const keyboard = JSON.stringify({ inline_keyboard });
      params.set("reply_markup", keyboard);
    }
    const url = `${base_url}?${params.toString()}`;
    const response = await fetch(url).then((resp) => resp.json());
    return response;
  }
  async answerCallbackQuery(callbackQueryId, text = void 0, showAlert = false) {
    const base_url = `${this.url}/answerCallbackQuery`;
    const params = new URLSearchParams({
      callback_query_id: callbackQueryId.toString(),
      show_alert: showAlert.toString()
    });
    if (text) {
      params.set("text", text);
    }
    const url = `${base_url}?${params.toString()}`;
    const response = await fetch(url).then((resp) => resp.json());
    return response;
  }
};
var randomfoodBot = class extends BotModel {
  constructor(config) {
    super(config);
  }
  async start(req, args) {
    const text = await this.database.db("randomfood").collection("creditdatabase").insertOne({ hi: this.message.text });
    await this.sendMessage(this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"), this.message.chat.id);
  }
  async about(req, args) {
    const text = "Bot n\xE0y t\u1EA1o ra b\u1EDFi <b>nthl</b> aka <b>rurimeiko</b> \u30FD(\u273F\uFF9F\u25BD\uFF9F)\u30CE";
    await this.sendMessage(text, this.message.chat.id);
  }
  async help(req, args) {
    const text = await this.database.db("randomfood").collection("creditdatabase").find();
    await this.sendMessage(this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"), this.message.chat.id);
  }
  async randomfood(req, args) {
    const text = "randomnek";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debt(req, args) {
    const text = "hiiii";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debthistory(req, args) {
    console.log(args);
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtcreate(req, args) {
    console.log(args);
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtpay(req, args) {
    console.log(args);
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtdelete(req, args) {
    console.log(args);
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debthelp(req, args) {
    console.log(args);
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async checkdate(req, args) {
    function convertMilliseconds(milliseconds) {
      if (milliseconds < 0) {
        return "Th\u1EDDi gian kh\xF4ng h\u1EE3p l\u1EC7";
      }
      const secondsInAMinute = 60;
      const secondsInAnHour = 3600;
      const secondsInADay = 86400;
      const secondsInAWeek = 604800;
      const secondsInAMonth = 2629800;
      const secondsInAYear = 31557600;
      const seconds = milliseconds / 1e3;
      if (seconds < secondsInAMinute) {
        return `${Math.round(seconds)} gi\xE2y`;
      } else if (seconds < secondsInAnHour) {
        return `${Math.round(seconds / secondsInAMinute)} ph\xFAt`;
      } else if (seconds < secondsInADay) {
        return `${Math.round(seconds / secondsInAnHour)} gi\u1EDD`;
      } else if (seconds < secondsInAWeek) {
        const days = Math.floor(seconds / secondsInADay);
        const remainingHours = Math.floor(seconds % secondsInADay / secondsInAnHour);
        return `${days} ng\xE0y ${remainingHours} gi\u1EDD`;
      } else if (seconds < secondsInAMonth) {
        const weeks = Math.floor(seconds / secondsInAWeek);
        const remainingDays = Math.floor(seconds % secondsInAWeek / secondsInADay);
        return `${weeks} tu\u1EA7n ${remainingDays} ng\xE0y`;
      } else if (seconds < secondsInAYear) {
        const months = Math.floor(seconds / secondsInAMonth);
        const remainingDays = Math.floor(seconds % secondsInAMonth / secondsInADay);
        const remainingHours = Math.floor(seconds % secondsInADay / secondsInAnHour);
        const remainingMinutes = Math.floor(seconds % secondsInAnHour / secondsInAMinute);
        const remainingSeconds = Math.round(seconds % secondsInAMinute);
        return `${months} th\xE1ng ${remainingDays} ng\xE0y ${remainingHours} gi\u1EDD ${remainingMinutes} ph\xFAt ${remainingSeconds} gi\xE2y`;
      } else {
        const years = Math.floor(seconds / secondsInAYear);
        const remainingMonths = Math.floor(seconds % secondsInAYear / secondsInAMonth);
        return `${years} n\u0103m ${remainingMonths} th\xE1ng`;
      }
    }
    const currentTime = /* @__PURE__ */ new Date();
    currentTime.setUTCHours(currentTime.getUTCHours() + 7);
    const timeDifference = currentTime.getTime() - anniversary_default.getTime();
    await this.sendMessage(`T\u1ED5ng th\u1EDDi gian b\xEAn eim: ${convertMilliseconds(timeDifference)}`, this.message.chat.id);
  }
};
var Handler = class {
  constructor(configs) {
    this.configs = configs;
    this.token = this.configs.token;
    this.response = new Response();
  }
  async handle(request) {
    this.request = await this.processRequest(request);
    this.bot = new randomfoodBot({
      database: this.configs.database,
      token: this.token,
      commands: this.configs.commands
    });
    if (this.request.method === "POST" && this.request.type.includes("application/json") && this.request.size > 6 && this.request.content.message)
      this.response = await this.bot.update(this.request);
    else
      this.response = this.error(this.request.content.error);
    return this.response;
  }
  error(error) {
    throw new Error(error);
  }
  async processRequest(req) {
    let request = req;
    request.size = parseInt(request.headers.get("content-length")) || 0;
    request.type = request.headers.get("content-type") || "";
    if (request.size && request.type)
      request.content = await this.getContent(request);
    else
      request.content = {
        message: "",
        error: "Invalid content type or body"
      };
    return request;
  }
  async getContent(request) {
    if (request.type.includes("application/json")) {
      return await request.json();
    }
    return {
      message: "",
      error: "Invalid content/content type"
    };
  }
};
var MongodbError = class extends Error {
  constructor({ error, error_code, link }, status = 500) {
    super(error);
    this.name = "MongodbError";
    this.status = status;
    if (error_code)
      this.title = error_code;
    if (link)
      this.meta = { link };
  }
};
var MongoDB = class {
  constructor({
    apiKey,
    apiUrl,
    dataSource
  }) {
    this.currentDatabase = null;
    this.currentCollection = null;
    this.aggregate = async ({ pipeline }) => this.request("aggregate", { pipeline });
    this.deleteOne = async ({ filter }) => this.request("deleteOne", { filter });
    this.deleteMany = async ({ filter }) => this.request("deleteMany", { filter });
    this.find = async ({
      filter,
      projection,
      sort,
      limit,
      skip
    } = {
      filter: {},
      projection: {},
      sort: void 0,
      limit: void 0,
      skip: void 0
    }) => this.request("find", {
      filter,
      projection,
      sort,
      limit,
      skip
    });
    this.findOne = async ({ filter, projection } = {
      filter: {},
      projection: {}
    }) => this.request("findOne", {
      filter,
      projection
    });
    this.insertOne = async (document) => this.request("insertOne", { document });
    this.insertMany = async (documents) => this.request("insertMany", { documents });
    this.replaceOne = async ({
      filter,
      replacement,
      upsert
    }) => this.request("replaceOne", {
      filter,
      replacement,
      upsert
    });
    this.updateOne = async ({
      filter,
      update,
      upsert
    }) => this.request("updateOne", {
      filter,
      update,
      upsert
    });
    this.updateMany = async ({
      filter,
      update,
      upsert
    }) => this.request("updateMany", {
      filter,
      update,
      upsert
    });
    if (!apiUrl || !apiKey)
      throw new MongodbError("The `apiUrl` and `apiKey` must always be set.");
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.dataSource = dataSource;
    this.interpose = (passThrough) => passThrough;
  }
  db(database) {
    this.currentDatabase = database;
    return this;
  }
  collection(collection) {
    this.currentCollection = collection;
    return this;
  }
  makeAndAssertConnectionIsValid() {
    if (!this.dataSource || !this.currentDatabase || !this.currentCollection) {
      throw new MongodbError("Database and collection must be set before calling this method.");
    }
    return {
      dataSource: this.dataSource,
      database: this.currentDatabase,
      collection: this.currentCollection
    };
  }
  async request(name, parameters) {
    const { body } = this.interpose({
      name,
      body: {
        ...parameters || {},
        ...this.makeAndAssertConnectionIsValid()
      }
    });
    const response = await fetch(this.apiUrl + "/action/" + name, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "access-control-request-headers": "*",
        "api-key": this.apiKey
      },
      body: JSON.stringify(body)
    });
    const status = response.status || response.statusCode || 500;
    if (status === 200 || status === 201) {
      return response.json();
    } else {
      let error = response.headers["content-type"]?.includes("application/json") ? await response.json() : await response.text();
      if (typeof error === "string") {
        if (error.includes("{")) {
          try {
            error = JSON.parse(error);
          } catch (ignore) {
            error = { error };
          }
        } else {
          error = { error };
        }
      }
      return Promise.reject(new MongodbError(error, status));
    }
  }
};
var botCommands = {
  start: async (bot, req, args) => await bot.start(req, args),
  help: async (bot, req, args) => await bot.help(req, args),
  randomfood: async (bot, req, args) => await bot.randomfood(req, args),
  debt: async (bot, req, args) => await bot.debt(req, args),
  debthistory: async (bot, req, args) => await bot.debthistory(req, args),
  debtcreate: async (bot, req, args) => await bot.debtcreate(req, args),
  debtpay: async (bot, req, args) => await bot.debtpay(req, args),
  debtdelete: async (bot, req, args) => await bot.debtdelete(req, args),
  debthelp: async (bot, req, args) => await bot.debthelp(req, args),
  about: async (bot, req, args) => await bot.about(req, args),
  checkdate: async (bot, req, args) => await bot.checkdate(req, args)
};
var command_default = botCommands;
var worker = {
  async fetch(req, env) {
    const database = new MongoDB({
      apiKey: env.API_MONGO_TOKEN,
      apiUrl: env.URL_API_MONGO,
      dataSource: "AtlasCluster"
    });
    const url = new URL(req.url);
    const path = url.pathname.replace(/[/]$/, "");
    if (path !== "/api/randomfood") {
      return toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
    }
    const botConfig = {
      database,
      token: env.API_TELEGRAM,
      commands: {
        "/start": command_default.start,
        "/help": command_default.help,
        "/randomfood": command_default.randomfood,
        "/debt": command_default.debt,
        "/debthistory": command_default.debthistory,
        "/debtcreate": command_default.debtcreate,
        "/debtpay": command_default.debtpay,
        "/debtdelete": command_default.debtdelete,
        "/debthelp": command_default.debthelp,
        "/about": command_default.about,
        "/checkdate": command_default.checkdate
      }
    };
    const bot = new Handler(botConfig);
    try {
      return bot.handle(req);
    } catch (err) {
      const msg = err.message || "Error with query.";
      return toError(msg, 500);
    }
  }
};
var src_default = worker;
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
