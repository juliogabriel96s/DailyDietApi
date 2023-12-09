import fastify from "fastify";
import { DailyDietyRoutes } from "./routes/dailyDiety";
import cookie from "@fastify/cookie";

const app = fastify();

app.register(cookie);

app.register(DailyDietyRoutes, {
  prefix: "diety",
});

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log("http server running");
  });
