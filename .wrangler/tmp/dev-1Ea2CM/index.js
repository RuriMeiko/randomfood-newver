// .wrangler/tmp/bundle-33p6Ns/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

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
    this.bingImageCT = config.bingImageCT;
    this.token = config.token;
    this.commands = config.commands;
    this.url = "https://api.telegram.org/bot" + this.token;
    this.database = config.database;
    this.userBot = config.userBot;
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
      } else {
        console.log(this.message);
      }
    } catch (error) {
      console.error(error);
      return toError(error.message);
    }
    return toJSON("OK");
  }
  async updateCallback(request) {
    try {
      this.message = request.content.callback_query;
      await this.sendMessage(this.makeHtmlCode(JSON.stringify(this.message, null, 2), "JSON"), this.message.message.chat.id);
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
    let command = cmdArray.shift();
    if (command.endsWith("@" + this.userBot)) {
      let cmdArray2 = command.split("@");
      command = cmdArray2.shift();
    }
    const isCommand = Object.keys(this.commands).includes(command);
    if (isCommand) {
      await this.commands[command](this, req, cmdArray.join(""));
      return true;
    }
    return false;
  }
  async sendMessage(text, chatId, inlineKeyboard = void 0, parseMode = "HTML") {
    const base_url = `${this.url}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : { remove_keyboard: true }
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error sending message:", error.message);
      return null;
    }
  }
  async sendMediaGroup(photoUrls, chatId, caption = "", parseMode = "HTML") {
    const base_url = `${this.url}/sendMediaGroup`;
    const photos = photoUrls.map((photoUrl) => ({
      type: "photo",
      media: photoUrl,
      caption
    }));
    const body = {
      chat_id: chatId,
      media: photos,
      parse_mode: parseMode,
      caption
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error sending media group:", error.message);
      return null;
    }
  }
  async sendSticker(stickerId, chatId, replyMarkup = void 0) {
    const base_url = `${this.url}/sendSticker`;
    const body = {
      chat_id: chatId,
      sticker: stickerId,
      reply_markup: replyMarkup ? { inline_keyboard: replyMarkup } : { remove_keyboard: true }
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error sending sticker:", error.message);
      return null;
    }
  }
  async sendPhoto(photoUrls, chatId, caption = "", inlineKeyboard = void 0, parseMode = "HTML") {
    const base_url = `${this.url}/sendPhoto`;
    const body = {
      chat_id: chatId,
      photo: photoUrls,
      parse_mode: parseMode,
      caption,
      reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : { remove_keyboard: true }
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error sending photos:", error.message);
      return null;
    }
  }
  async editMessage(text, chatId, messageId, inlineKeyboard = void 0, parseMode = "HTML") {
    const base_url = `${this.url}/editMessageText`;
    const body = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: parseMode,
      reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : { remove_keyboard: true }
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error editing message:", error.message);
      return null;
    }
  }
  async answerCallbackQuery(callbackQueryId, text = void 0, showAlert = false) {
    const base_url = `${this.url}/answerCallbackQuery`;
    const body = {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert
    };
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then((resp) => resp.json());
      return response;
    } catch (error) {
      console.error("Error answering callback query:", error.message);
      return null;
    }
  }
};
var randomfoodBot = class extends BotModel {
  constructor(config) {
    super(config);
  }
  async start(req, content) {
    const text = await this.database.db("randomfood").collection("credit").insertOne({ hi: this.message.text });
    await this.sendMessage(this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"), this.message.chat.id);
  }
  async about(req, content) {
    const text = "Bot n\xE0y t\u1EA1o ra b\u1EDFi <b>nthl</b> aka <b>rurimeiko</b> \u30FD(\u273F\uFF9F\u25BD\uFF9F)\u30CE";
    await this.sendMessage(text, this.message.chat.id);
  }
  async help(req, content) {
    const text = await this.database.db("randomfood").collection("credit").find();
    await this.sendMessage(this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"), this.message.chat.id);
  }
  async randomfood(req, content) {
    function makeHowtoUrlsearch(keyword) {
      return `https://www.google.com/search?q=C%C3%A1ch%20l%C3%A0m%20${encodeURIComponent(keyword)}`;
    }
    const today = /* @__PURE__ */ new Date();
    today.setUTCHours(0, 0, 0, 0);
    const checkrandom = await this.database.db("randomfood").collection("historyfood").find({
      filter: {
        userid: this.message.chat.id,
        RandomAt: {
          $gte: { $date: today.toISOString() }
        }
      }
    });
    if (checkrandom.documents.length == 0) {
      const lastrandom = await this.database.db("randomfood").collection("historyfood").find({
        filter: {
          userid: this.message.chat.id
        },
        sort: {
          RandomAt: -1
        },
        limit: 1
      });
      await this.sendMessage(content, this.message.chat.id);
      let subfood;
      let mainfood = await this.database.db("randomfood").collection("mainfood").aggregate({ pipeline: [{ $sample: { size: 1 } }] });
      if (lastrandom.documents.length) {
        while (mainfood.documents[0]._id == lastrandom.documents[0]._id) {
          mainfood = await this.database.db("randomfood").collection("mainfood").aggregate({ pipeline: [{ $sample: { size: 1 } }] });
        }
      }
      if (!mainfood.documents[0].only) {
        subfood = await this.database.db("randomfood").collection("subfood").aggregate({ pipeline: [{ $sample: { size: 1 } }] });
      }
      const dataInsert = {
        userid: this.message.chat.id,
        food: mainfood.documents[0]._id,
        subfood: null,
        RandomAt: {
          $date: /* @__PURE__ */ new Date()
        }
      };
      if (!subfood) {
        await this.database.db("randomfood").collection("historyfood").insertOne(dataInsert);
        return await this.sendPhoto(mainfood.documents[0].img, this.message.chat.id, `T\u1EDB g\u1EE3i \xFD n\u1EA5u m\xF3n <a href='${makeHowtoUrlsearch(mainfood.documents[0].name)}'>${mainfood.documents[0].name}</a> th\u1EED nha \u{1F924}
C\u1EADu c\xF3 th\u1EC3 th\xEAm tu\u1EF3 bi\u1EBFn d\u1EF1a v\xE0o nhu c\u1EA7u hi\u1EC7n t\u1EA1i nh\xE9 \u{1F92D}`);
      } else {
        dataInsert.subfood = subfood.documents[0]._id;
        await this.database.db("randomfood").collection("historyfood").insertOne(dataInsert);
        return await this.sendPhoto(mainfood.documents[0].img, this.message.chat.id, `T\u1EDB g\u1EE3i \xFD n\u1EA5u m\xF3n <a href='${makeHowtoUrlsearch(mainfood.documents[0].name)}'>${mainfood.documents[0].name}</a> k\u1EBFt h\u1EE3p v\u1EDBi m\xF3n ph\u1EE5 l\xE0 <a href='${makeHowtoUrlsearch(subfood.documents[0].name)}'>${subfood.documents[0].name}</a> th\u1EED nha \u{1F924}
C\u1EADu c\xF3 th\u1EC3 th\xEAm tu\u1EF3 bi\u1EBFn d\u1EF1a v\xE0o nhu c\u1EA7u hi\u1EC7n t\u1EA1i nh\xE9 \u{1F92D}`);
      }
    } else {
      await this.sendSticker("CAACAgIAAxkBAAEot_VlmvKyl62IGNoRf6p64AqordsrkAACyD8AAuCjggeYudaMoCc1bzQE", this.message.chat.id);
      return await this.sendMessage("C\u1EADu \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EE3i \xFD ro\xE0i, t\u1EDB hong g\u1EE3i \xFD th\xEAm m\xF3n n\u1EEFa \u0111auuu", this.message.chat.id);
    }
  }
  async debt(req, content) {
    const text = "hiiii";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debthistory(req, content) {
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtcreate(req, content) {
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtpay(req, content) {
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debtdelete(req, content) {
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async debthelp(req, content) {
    const text = "n\u1EE3 n\u1EA7n eo oi";
    await this.sendMessage(text, this.message.chat.id);
  }
  async checkdate(req, content) {
    if (this.message.from.id === 1775446945 || this.message.from.id === 6831903438) {
      let convertMilliseconds = function(milliseconds, check = false) {
        if (milliseconds < 0) {
          return "Th\u1EDDi gian kh\xF4ng h\u1EE3p l\u1EC7";
        }
        const secondsInAMinute = 60;
        const secondsInAnHour = 3600;
        const secondsInADay = 86400;
        const secondsInAWeek = 604800;
        const secondsInAMonth = 2592e3;
        const secondsInAYear = 31536e3;
        const seconds = milliseconds / 1e3;
        if (seconds < secondsInAMinute) {
          return `${Math.round(seconds)} gi\xE2y`;
        } else if (seconds < secondsInAnHour) {
          return `${Math.round(seconds / secondsInAMinute)} ph\xFAt`;
        } else if (seconds < secondsInADay) {
          return `${Math.round(seconds / secondsInAnHour)} gi\u1EDD`;
        } else if (seconds < secondsInAWeek || check) {
          const days = Math.floor(seconds / secondsInADay);
          const remainingHours = Math.floor(seconds % secondsInADay / secondsInAnHour);
          const remainingMinutes = Math.floor(seconds % secondsInADay % secondsInAnHour / secondsInAMinute);
          const remainingSeconds = Math.round(seconds % secondsInADay % secondsInAnHour % secondsInAMinute);
          return `${days} ng\xE0y ${remainingHours} gi\u1EDD ${remainingMinutes} ph\xFAt ${remainingSeconds} gi\xE2y`;
        } else if (seconds < secondsInAMonth) {
          const weeks = Math.floor(seconds / secondsInAWeek);
          const remainingDays = Math.floor(seconds % secondsInAWeek / secondsInADay);
          const remainingHours = Math.floor(seconds % secondsInAWeek % secondsInADay / secondsInAnHour);
          const remainingMinutes = Math.floor(seconds % secondsInAWeek % secondsInADay % secondsInAnHour / secondsInAMinute);
          const remainingSeconds = Math.round(seconds % secondsInAWeek % secondsInADay % secondsInAnHour % secondsInAMinute);
          return `${weeks} tu\u1EA7n ${remainingDays} ng\xE0y ${remainingHours} gi\u1EDD ${remainingMinutes} ph\xFAt ${remainingSeconds} gi\xE2y`;
        } else if (seconds < secondsInAYear) {
          const months = Math.floor(seconds / secondsInAMonth);
          const remainingweeks = Math.floor(seconds % secondsInAMonth / secondsInAWeek);
          const remainingDays = Math.floor(seconds % secondsInAMonth % secondsInAWeek / secondsInADay);
          const remainingHours = Math.floor(seconds % secondsInAMonth % secondsInAWeek % secondsInADay / secondsInAnHour);
          const remainingMinutes = Math.floor(seconds % secondsInAMonth % secondsInAWeek % secondsInADay % secondsInAnHour / secondsInAMinute);
          const remainingSeconds = Math.round(seconds % secondsInAMonth % secondsInAWeek % secondsInADay % secondsInAnHour % secondsInAMinute);
          return `${months} th\xE1ng ${remainingweeks} tu\u1EA7n ${remainingDays} ng\xE0y ${remainingHours} gi\u1EDD ${remainingMinutes} ph\xFAt ${remainingSeconds} gi\xE2y`;
        } else {
          const years = Math.floor(seconds / secondsInAYear);
          const remainingMonths = Math.floor(seconds % secondsInAYear / secondsInAMonth);
          const remainingweeks = Math.floor(seconds % secondsInAYear % secondsInAMonth / secondsInAWeek);
          const remainingDays = Math.floor(seconds % secondsInAYear % secondsInAMonth % secondsInAWeek / secondsInADay);
          const remainingHours = Math.floor(seconds % secondsInAYear % secondsInAMonth % secondsInAWeek % secondsInADay / secondsInAnHour);
          const remainingMinutes = Math.floor(seconds % secondsInAYear % secondsInAMonth % secondsInAWeek % secondsInADay % secondsInAnHour / secondsInAMinute);
          const remainingSeconds = Math.round(seconds % secondsInAYear % secondsInAMonth % secondsInAWeek % secondsInADay % secondsInAnHour % secondsInAMinute);
          return `${years} n\u0103m ${remainingMonths} th\xE1ng ${remainingweeks} tu\u1EA7n ${remainingDays} ng\xE0y ${remainingHours} gi\u1EDD ${remainingMinutes} ph\xFAt ${remainingSeconds} gi\xE2y`;
        }
      };
      const currentTime = /* @__PURE__ */ new Date();
      currentTime.setUTCHours(currentTime.getUTCHours() + 7);
      const timeDifference = currentTime.getTime() - anniversary_default.getTime();
      return await this.sendMessage(`${this.makeHtmlCode(`#loveYouUntilTheWorldEnd {
					time: ${convertMilliseconds(timeDifference)};
					day: ${convertMilliseconds(timeDifference, true)};
					}`, "CSS")}`, this.message.chat.id);
    } else
      return await this.sendMessage("Ki\u1EBFm ngiu \u0111i m\u1EA5y a zai!", this.message.chat.id);
  }
  async image(req, content) {
    const text = this.message.text;
    if (text.length > 6) {
      await this.sendMessage(this.makeHtmlCode(text.slice(7), "JSON"), this.message.chat.id);
      try {
        const imgLink = await this.bingImageCT.getImages(text.slice(7));
        await this.sendMediaGroup(imgLink, this.message.chat.id, text.slice(7));
      } catch (err) {
        await this.sendMessage(err.message, this.message.chat.id);
      }
    } else
      await this.sendMessage("G\u1EEDi <code>/image a cat</code> \u0111\u1EC3 t\u1EA1o \u1EA3nh con m\xE8o", this.message.chat.id);
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
      userBot: this.configs.userBot,
      bingImageCT: this.configs.bingImageCT,
      database: this.configs.database,
      token: this.token,
      commands: this.configs.commands
    });
    if (this.request.method === "POST" && this.request.type.includes("application/json") && this.request.size > 6 && this.request.content.message)
      this.response = await this.bot.update(this.request);
    else if (this.request.method === "POST" && this.request.type.includes("application/json") && this.request.size > 6 && this.request.content.callback_query) {
      this.response = await this.bot.updateCallback(this.request);
    } else {
      console.log(JSON.stringify(this.request.content, null, 2));
      this.response = toJSON("OK");
    }
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
  checkdate: async (bot, req, args) => await bot.checkdate(req, args),
  image: async (bot, req, args) => await bot.image(req, args)
};
var command_default = botCommands;
var BingImageCreater = class {
  constructor(_U, SRCHHPGUSR) {
    this.sessionCookies = [];
    this._U = _U;
    this.SRCHHPGUSR = SRCHHPGUSR;
    this.sessionCookies.push(`_U=${this._U}`);
    this.sessionCookies.push(`SRCHHPGUSR=${this.SRCHHPGUSR}`);
    this.BING_URL = "https://www.bing.com";
  }
  async makeSessionFetch(url, method = "GET", body = null) {
    const randomIpSegment = () => Math.floor(Math.random() * 256);
    const FORWARDED_IP = `13.${Math.floor(Math.random() * 4) + 104}.${randomIpSegment()}.${randomIpSegment()}`;
    const defaultOptions = {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.bing.com",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        Referer: url,
        "x-forwarded-for": FORWARDED_IP
      },
      body,
      method
    };
    if (this.sessionCookies.length > 0) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        cookie: this.sessionCookies.join("; ")
      };
    }
    try {
      const response = await fetch(url, defaultOptions);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const setCookieHeaders = response.headers.getAll("Set-Cookie");
      if (setCookieHeaders) {
        setCookieHeaders.forEach((setCookieHeader) => {
          const cookieKey = setCookieHeader.split(";")[0];
          const existingIndex = this.sessionCookies.findIndex((cookie) => cookie.startsWith(cookieKey));
          if (existingIndex !== -1) {
            this.sessionCookies[existingIndex] = setCookieHeader;
          } else {
            this.sessionCookies.push(setCookieHeader);
          }
        });
      }
      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }
  async getImages(prompt) {
    console.log("Sending request...");
    const urlEncodedPrompt = encodeURIComponent(prompt);
    const error_mess = {
      error_blocked_prompt: "Your prompt has been blocked by Bing. Try to change any bad words and try again.",
      error_being_reviewed_prompt: "Your prompt is being reviewed by Bing. Try to change any sensitive words and try again.",
      error_noresults: "Could not get results",
      error_unsupported_lang: "\nthis language is currently not supported by bing"
    };
    let response;
    const url = `${this.BING_URL}/images/create?q=${urlEncodedPrompt}&rt=4&FORM=GENCRE`;
    response = await this.makeSessionFetch(url, "POST", `q=${urlEncodedPrompt}&qs=ds`);
    if (response.status !== 302 && response.status !== 200) {
      console.error(`ERROR: the status is ${response.status} instead of 302 or 200`);
      const url2 = `${this.BING_URL}/images/create?q=${urlEncodedPrompt}&rt=3&FORM=GENCRE`;
      response = await this.makeSessionFetch(url2, "POST", `q=${urlEncodedPrompt}&qs=ds`);
      throw new Error("Redirect failed");
    }
    let redirectUrl = response.url.replace("&nfy=1", "");
    const requestId = redirectUrl.split("id=")[1];
    await this.makeSessionFetch(redirectUrl);
    const pollingUrl = `${this.BING_URL}/images/create/async/results/${requestId}?q=${urlEncodedPrompt}`;
    const startWait = Date.now();
    let imagesResponse;
    let dataResponse;
    while (true) {
      if (Date.now() - startWait > 1e3 * 60 * 5) {
        throw new Error("Timeout error");
      }
      console.log(".", { end: "", flush: true });
      imagesResponse = await this.makeSessionFetch(pollingUrl);
      if (imagesResponse.status !== 200) {
        throw new Error("Could not get results");
      }
      const contentType = imagesResponse.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        dataResponse = await imagesResponse.json();
      } else {
        dataResponse = await imagesResponse.text();
      }
      if (!dataResponse) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        continue;
      } else {
        break;
      }
    }
    if (dataResponse.errorMessage === "Pending") {
      throw new Error("This prompt has been blocked by Bing. Bing's system flagged this prompt because it may conflict with their content policy. More policy violations may lead to automatic suspension of your access.");
    } else if (dataResponse.errorMessage) {
      throw new Error("Bing returned an error: " + dataResponse.errorMessage);
    }
    const imageLinks = dataResponse.match(/src="([^"]+)"/g).map((src) => src.slice(5, -1));
    const normalImageLinks = Array.from(new Set(imageLinks.map((link) => link.split("?w=")[0])));
    const badImages = [
      "https://r.bing.com/rp/in-2zU3AJUdkgFe7ZKv19yPBHVs.png",
      "https://r.bing.com/rp/TX9QuO3WzcCJz1uaaSwQAz39Kb0.jpg"
    ];
    if (normalImageLinks.length === 0) {
      throw new Error("No images");
    }
    const validImageLinks = [];
    for (const im of normalImageLinks) {
      if (badImages.includes(im)) {
        throw new Error("Bad images");
      }
      if (!im.endsWith(".svg"))
        validImageLinks.push(im);
    }
    return validImageLinks;
  }
};
var worker = {
  async fetch(req, env) {
    const database = new MongoDB({
      apiKey: env.API_MONGO_TOKEN,
      apiUrl: env.URL_API_MONGO,
      dataSource: "AtlasCluster"
    });
    const bingImageCT = new BingImageCreater(env._U_BING_COOKIE, env.SRCHHPGUSR_BING_COOKIE);
    const url = new URL(req.url);
    const path = url.pathname.replace(/[/]$/, "");
    if (path !== "/api/randomfood") {
      return toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
    }
    const botConfig = {
      userBot: "randomfoodruribot",
      bingImageCT,
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
        "/checkdate": command_default.checkdate,
        "/image": command_default.image
      }
    };
    const bot = new Handler(botConfig);
    try {
      return bot.handle(req);
    } catch (err) {
      const msg = err.message || "Error with query.";
      return toJSON(msg, 200);
    }
  },
  async scheduled(event, env, ctx) {
    console.log("cron processed");
  }
};
var src_default = worker;

// node_modules/wrangler/templates/middleware/middleware-scheduled.ts
var scheduled = async (request, env, _ctx, middlewareCtx) => {
  const url = new URL(request.url);
  if (url.pathname === "/__scheduled") {
    const cron = url.searchParams.get("cron") ?? "";
    await middlewareCtx.dispatch("scheduled", { cron });
    return new Response("Ran scheduled event");
  }
  return middlewareCtx.next(request, env);
};
var middleware_scheduled_default = scheduled;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;
var wrap = void 0;

// .wrangler/tmp/bundle-33p6Ns/middleware-insertion-facade.js
var envWrappers = [void 0, wrap].filter(Boolean);
var facade = {
  ...src_default,
  envWrappers,
  middleware: [
    middleware_scheduled_default,
    middleware_miniflare3_json_error_default,
    ...src_default.middleware ? src_default.middleware : []
  ].filter(Boolean)
};
var middleware_insertion_facade_default = facade;

// .wrangler/tmp/bundle-33p6Ns/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
var __facade_modules_fetch__ = function(request, env, ctx) {
  if (middleware_insertion_facade_default.fetch === void 0)
    throw new Error("Handler does not export a fetch() function.");
  return middleware_insertion_facade_default.fetch(request, env, ctx);
};
function getMaskedEnv(rawEnv) {
  let env = rawEnv;
  if (middleware_insertion_facade_default.envWrappers && middleware_insertion_facade_default.envWrappers.length > 0) {
    for (const wrapFn of middleware_insertion_facade_default.envWrappers) {
      env = wrapFn(env);
    }
  }
  return env;
}
var registeredMiddleware = false;
var facade2 = {
  ...middleware_insertion_facade_default.tail && {
    tail: maskHandlerEnv(middleware_insertion_facade_default.tail)
  },
  ...middleware_insertion_facade_default.trace && {
    trace: maskHandlerEnv(middleware_insertion_facade_default.trace)
  },
  ...middleware_insertion_facade_default.scheduled && {
    scheduled: maskHandlerEnv(middleware_insertion_facade_default.scheduled)
  },
  ...middleware_insertion_facade_default.queue && {
    queue: maskHandlerEnv(middleware_insertion_facade_default.queue)
  },
  ...middleware_insertion_facade_default.test && {
    test: maskHandlerEnv(middleware_insertion_facade_default.test)
  },
  ...middleware_insertion_facade_default.email && {
    email: maskHandlerEnv(middleware_insertion_facade_default.email)
  },
  fetch(request, rawEnv, ctx) {
    const env = getMaskedEnv(rawEnv);
    if (middleware_insertion_facade_default.middleware && middleware_insertion_facade_default.middleware.length > 0) {
      if (!registeredMiddleware) {
        registeredMiddleware = true;
        for (const middleware of middleware_insertion_facade_default.middleware) {
          __facade_register__(middleware);
        }
      }
      const __facade_modules_dispatch__ = function(type, init) {
        if (type === "scheduled" && middleware_insertion_facade_default.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return middleware_insertion_facade_default.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(
        request,
        env,
        ctx,
        __facade_modules_dispatch__,
        __facade_modules_fetch__
      );
    } else {
      return __facade_modules_fetch__(request, env, ctx);
    }
  }
};
function maskHandlerEnv(handler) {
  return (data, env, ctx) => handler(data, getMaskedEnv(env), ctx);
}
var middleware_loader_entry_default = facade2;
export {
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
