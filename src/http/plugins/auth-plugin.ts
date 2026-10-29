import { cors } from "@elysia/cors";
import { Elysia } from "elysia";
import { auth } from "~/auth/better-auth";

const corsConfig = cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .use(corsConfig)
  .use(
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .mount(auth.handler);
// .macro({
//   auth: {
//     async resolve({ status, request: { headers } }) {
//       const session = await auth.api.getSession({
//         headers,
//       });

//       if (!session) {
//         return status(401, {
//           message: "Unauthorized",
//         });
//       }

//       return session;
//     },
//   },
// });

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());
export const OpenAPI = {
  getPaths: (prefix = "/auth") =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null);
      for (const path of Object.keys(paths)) {
        const key = prefix + path;
        reference[key] = paths[path];
        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method];
          operation.tags = ["Better Auth"];
        }
      }
      return reference;
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
