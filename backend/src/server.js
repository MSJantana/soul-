require("dotenv/config");

const { createApp } = require("./app");

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, () => {
  process.stdout.write(`API: http://localhost:${port}\n`);
});

