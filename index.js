  import express from "express";
  import bodyParser from "body-parser";
  import session from "express-session";
  import cookieParser from "cookie-parser";
  import fs from "fs";
  import path from "path";

  const app = express();
  const port = 3500;

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static("public"));

  app.use(
    session({
      secret: "segredo-lol",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 60 * 1000 }, // 30 minutos
    })
  );

  const FILE = process.env.NODE_ENV === "production" ? path.join("/tmp", "data.json") : "data.json";

  let equipes = [];
  let jogadores = [];

  if (fs.existsSync(FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
      equipes = data.equipes || [];
      jogadores = data.jogadores || [];
    } catch {
      equipes = [];
      jogadores = [];
    }
  }

  function salvar() {
    fs.writeFileSync(FILE, JSON.stringify({ equipes, jogadores }, null, 2));
  }

  /* ---------- MIDDLEWARE PARA PROTEGER ROTAS ---------- */
  function verificarLogin(req, res, next) {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    next();
  }

  /* -------------------- LAYOUT ---------------------- */
  function layout(req, titulo, conteudo) {
    const logado = req.session.user ? true : false;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${titulo}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

      <style>
        body {
          background-color: #000 !important;
          color: white !important;
        }
        .navbar {
          background-color: #111 !important;
          border-bottom: 2px solid #c9a86a !important;
        }
        .btn, .navbar a {
          background-color: #c9a86a !important;
          border-color: #c9a86a !important;
          color: black !important;
          font-weight: bold;
        }
        .btn:hover {
          background-color: #e5c37a !important;
        }
        table thead {
          background-color: #c9a86a !important;
          color: black !important;
        }
        header img {
          display: block;
          margin: 20px auto;
        }
      </style>
    </head>

    <body>

      <header>
        <img src="/imagens/logoLOL.png">
      </header>

      ${
        logado
          ? `
      <nav class="navbar navbar-expand-lg navbar-dark mb-4">
        <div class="container-fluid">
          <ul class="navbar-nav">
            <li class="nav-item"><a class="nav-link" href="/home">Início</a></li>
            <li class="nav-item"><a class="nav-link" href="/equipe">Cadastrar equipe</a></li>
            <li class="nav-item"><a class="nav-link" href="/jogador">Cadastrar jogador</a></li>
            <li class="nav-item"><a class="nav-link" href="/logout">Logout</a></li>
          </ul>

          <span class="text-white">Logado como: ${req.session.user}</span>
        </div>
      </nav>
      `
          : ""
      }

      <div class="container">
        ${conteudo}
      </div>

    </body>
    </html>`;
  }

  /* ---------------- LOGIN É A PÁGINA INICIAL ---------------- */
  app.get("/", (req, res) => {
    res.redirect("/login");
  });

  /* ---------------- LOGIN ---------------- */
  app.get("/login", (req, res) => {
    res.send(
      layout(
        req,
        "Login",
        `
        <h2 class="text-center">Login</h2>
        <form method="POST" class="mt-3 col-md-6 offset-md-3">

          <div class="mb-3">
            <label class="form-label">Usuário</label>
            <input name="user" class="form-control">
          </div>

          <div class="mb-3">
            <label class="form-label">Senha</label>
            <input type="password" name="pass" class="form-control">
          </div>

          <button class="btn w-100">Entrar</button>
        </form>
        `
      )
    );
  });

  app.post("/login", (req, res) => {
    const { user, pass } = req.body;

    if (user === "adm" && pass === "123456") {
      req.session.user = user;
      return res.redirect("/home");
    }

    res.send(
      layout(
        req,
        "Erro",
        `<div class="alert alert-danger">Usuário ou senha inválidos.</div>
        <a class="btn" href="/login">Tentar novamente</a>`
      )
    );
  });

  /* ---------------- LOGOUT ---------------- */
  app.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });

  /* ---------------- HOME (APÓS LOGIN) ---------------- */
  app.get("/home", verificarLogin, (req, res) => {
    const last = req.cookies.lastAccess
      ? `<p>Último acesso: ${req.cookies.lastAccess}</p>`
      : "<p>Primeiro acesso!</p>";

    res.cookie("lastAccess", new Date().toLocaleString());

    res.send(
      layout(
        req,
        "Home",
        `
        <h1>Campeonato Amador de League of Legends</h1>
        ${last}
        `
      )
    );
  });

  /* ---------------- CADASTRO DE EQUIPE (PROTEGIDO) ---------------- */
  app.get("/equipe", verificarLogin, (req, res) => {
    const tabela = equipes
      .map(
        (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${e.nome}</td>
          <td>${e.capitao}</td>
          <td>${e.contato}</td>
        </tr>`
      )
      .join("");

    res.send(
      layout(
        req,
        "Equipes",
        `
        <h2>Cadastrar Equipe</h2>

        <form method="POST" action="/equipe/cadastrar" class="row g-3">

          <div class="col-md-6">
            <label class="form-label">Nome da equipe</label>
            <input name="nome" class="form-control">
          </div>

          <div class="col-md-6">
            <label class="form-label">Capitão</label>
            <input name="capitao" class="form-control">
          </div>

          <div class="col-md-6">
            <label class="form-label">Contato do capitão</label>
            <input name="contato" class="form-control">
          </div>

          <div class="col-12 mt-3">
            <button class="btn">Cadastrar</button>
          </div>
        </form>

        <h3 class="mt-4">Equipes cadastradas</h3>

        <table class="table table-dark table-striped">
          <thead>
            <tr><th>#</th><th>Equipe</th><th>Capitão</th><th>Contato</th></tr>
          </thead>
          <tbody>${tabela}</tbody>
        </table>
        `
      )
    );
  });

  app.post("/equipe/cadastrar", verificarLogin, (req, res) => {
    const { nome, capitao, contato } = req.body;

    if (!nome || !capitao || !contato) {
      return res.send(
        layout(
          req,
          "Erro",
          `<div class="alert alert-danger">Preencha todos os campos.</div>
          <a href="/equipe" class="btn">Voltar</a>`
        )
      );
    }

    equipes.push({ nome, capitao, contato });
    salvar();

    res.send(
      layout(
        req,
        "Sucesso",
        `<div class="alert alert-success">Equipe cadastrada com sucesso!</div>
        <a href="/equipe" class="btn">Voltar</a>`
      )
    );
  });

  /* ---------------- CADASTRO DE JOGADOR (PROTEGIDO) ---------------- */
  app.get("/jogador", verificarLogin, (req, res) => {
    const options = equipes
      .map((e) => `<option value="${e.nome}">${e.nome}</option>`)
      .join("");

    const tabela = equipes
      .map((e) => {
        const lista = jogadores
          .filter((j) => j.equipe === e.nome)
          .map((j) => `<li>${j.nome} (${j.funcao})</li>`)
          .join("");

        return `<h4>${e.nome}</h4><ul>${lista || "<i>Sem jogadores</i>"}</ul>`;
      })
      .join("<hr>");

    res.send(
      layout(
        req,
        "Jogadores",
        `
        <h2>Cadastrar Jogador</h2>

        <form method="POST" action="/jogador/cadastrar" class="row g-3">

          <div class="col-md-6">
            <label class="form-label">Nome</label>
            <input name="nome" class="form-control">
          </div>

          <div class="col-md-6">
            <label class="form-label">Nickname</label>
            <input name="nick" class="form-control">
          </div>

          <div class="col-md-4">
            <label class="form-label">Função</label>
            <select name="funcao" class="form-control">
              <option>top</option><option>jungle</option><option>mid</option>
              <option>atirador</option><option>suporte</option>
            </select>
          </div>

          <div class="col-md-4">
            <label class="form-label">Elo</label>
            <select name="elo" class="form-control">
              <option>Ferro</option><option>Bronze</option><option>Prata</option>
              <option>Ouro</option><option>Platina</option><option>Diamante</option>
            </select>
          </div>

          <div class="col-md-4">
            <label class="form-label">Gênero</label>
            <select name="genero" class="form-control">
              <option>Masculino</option><option>Feminino</option><option>Outro</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Equipe</label>
            <select name="equipe" class="form-control">
              ${options}
            </select>
          </div>

          <div class="col-12 mt-3">
            <button class="btn">Cadastrar</button>
          </div>
        </form>

        <h3 class="mt-4">Jogadores cadastrados</h3>
        ${tabela}
        `
      )
    );
  });

  app.post("/jogador/cadastrar", verificarLogin, (req, res) => {
    const { nome, nick, funcao, elo, genero, equipe } = req.body;

    if (!nome || !nick || !funcao || !elo || !genero || !equipe) {
      return res.send(
        layout(
          req,
          "Erro",
          `<div class="alert alert-danger">Preencha todos os campos.</div>
          <a href="/jogador" class="btn">Voltar</a>`
        )
      );
    }

    const qtdJog = jogadores.filter((j) => j.equipe === equipe).length;
    if (qtdJog >= 5) {
      return res.send(
        layout(
          req,
          "Erro",
          `<div class="alert alert-danger">A equipe já possui 5 jogadores.</div>
          <a href="/jogador" class="btn">Voltar</a>`
        )
      );
    }

    jogadores.push({ nome, nick, funcao, elo, genero, equipe });
    salvar();

    res.send(
      layout(
        req,
        "Sucesso",
        `<div class="alert alert-success">Jogador cadastrado!</div>
        <a href="/jogador" class="btn">Voltar</a>`
      )
    );
  });

  /* ------------------- SERVIDOR -------------------- */
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
