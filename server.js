const { createServer } = require("http");
const next = require("next");

const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((request, response) => {
      handle(request, response);
    }).listen(port, hostname, () => {
      console.log(`Daraja is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Daraja failed to start:", error);
    process.exit(1);
  });
