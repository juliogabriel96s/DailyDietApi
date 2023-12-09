import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export async function DailyDietyRoutes(app: FastifyInstance) {
  app.post("/users", async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string(),
      password: z.string(),
    });

    const { name, email, password } = createUserBodySchema.parse(request.body);

    await knex("user").insert({
      id: randomUUID(),
      name,
      email,
      password,
    });

    return reply.status(201).send();
  });

  app.post("/sessions", async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      password: z.string(),
    });

    const { name, password } = createUserBodySchema.parse(request.body);

    const session = await knex("user")
      .where({
        name,
        password,
      })
      .first();

    if (!session) {
      throw new Error("Your name or password are correct");
    }

    let sessionId = request.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      reply.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    }

    session.session_id = sessionId;
    return {
      session,
    };
  });

  app.post(
    "/",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createDailyDietyBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        dateAndHour: z.string(),
        isDiet: z.enum(["withinTheDiet", "offTheDiet"]),
      });

      const { sessionId } = request.cookies;

      const { name, description, dateAndHour, isDiet } =
        createDailyDietyBodySchema.parse(request.body);

      await knex("diety").insert({
        id: randomUUID(),
        name,
        description,
        dateAndHour,
        isDiet,
        sessionid: sessionId,
      });

      return reply.status(201).send();
    },
  );

  app.get("/", { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies;

    const dailyDiets = await knex("diety")
      .where("sessionid", sessionId)
      .select();

    return {
      dailyDiets,
    };
  });

  app.get("/:id", { preHandler: [checkSessionIdExists] }, async (request) => {
    const getDailyDietyParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = getDailyDietyParamsSchema.parse(request.params);

    const { sessionId } = request.cookies;

    const dailyDiety = await knex("diety")
      .where({
        sessionid: sessionId,
        id,
      })
      .first();

    return {
      dailyDiety,
    };
  });

  app.put(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getDailyDietyParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = getDailyDietyParamsSchema.parse(request.params);

      const { sessionId } = request.cookies;

      const updateDailyDietyBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        dateAndHour: z.string(),
        isDiet: z.enum(["withinTheDiet", "offTheDiet"]),
      });

      const { name, description, dateAndHour, isDiet } =
        updateDailyDietyBodySchema.parse(request.body);

      await knex("diety")
        .update({
          name,
          description,
          dateAndHour,
          isDiet,
        })
        .where({
          id,
          sessionid: sessionId,
        });

      return reply.status(201).send();
    },
  );

  app.delete(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getDailyDietyParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = getDailyDietyParamsSchema.parse(request.params);

      const { sessionId } = request.cookies;

      await knex("diety").delete().where({
        sessionid: sessionId,
        id,
      });

      return reply.status(201).send();
    },
  );

  app.get(
    "/summary",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies;

      const summary = await knex("diety").select("isDiet").where({
        sessionid: sessionId,
      });

      let bestSequence = 0;
      let currentSequence = 0;

      for (const sumary of summary) {
        if (sumary.isDiet === "withinTheDiet") {
          currentSequence++;
          bestSequence = Math.max(bestSequence, currentSequence);
        } else {
          currentSequence = 0;
        }
      }

      const inDiet = summary.filter((summarys) => summarys.isDiet).length;

      return reply.status(201).send({
        total: summary.length,
        inDiet,
        offDiet: summary.length - inDiet,
        bestSequence,
      });
    },
  );
}
